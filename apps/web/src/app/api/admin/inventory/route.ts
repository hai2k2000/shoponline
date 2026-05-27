import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function numberValue(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/inventory"), { status: 303 });
  const mode = text(formData, "mode");
  const productId = text(formData, "productId");
  if (!productId || !["import", "export", "adjust"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/inventory"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status === "ARCHIVED") throw new Error("Sản phẩm không hợp lệ.");
    const inventory = await tx.inventory.upsert({ where: { productId }, update: {}, create: { productId, quantity: 0, reservedQuantity: 0 } });
    const note = text(formData, "note") || (mode === "adjust" ? "Điều chỉnh tồn kho" : null);

    if (mode === "import") {
      const quantity = numberValue(formData, "quantity");
      if (quantity <= 0) return;
      const afterQuantity = inventory.quantity + quantity;
      await tx.inventory.update({ where: { productId }, data: { quantity: afterQuantity } });
      await tx.inventoryTransaction.create({ data: { productId, type: "IMPORT", quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
      await tx.activityLog.create({ data: { userId: user.id, action: "IMPORT_STOCK", entityType: "Product", entityId: productId, description: `Nhập kho ${quantity}` } });
    }

    if (mode === "export") {
      const quantity = numberValue(formData, "quantity");
      if (quantity <= 0) return;
      const available = inventory.quantity - inventory.reservedQuantity;
      if (quantity > available) throw new Error("Không đủ tồn khả dụng để xuất kho.");
      const afterQuantity = inventory.quantity - quantity;
      await tx.inventory.update({ where: { productId }, data: { quantity: afterQuantity } });
      await tx.inventoryTransaction.create({ data: { productId, type: "EXPORT", quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
      await tx.activityLog.create({ data: { userId: user.id, action: "EXPORT_STOCK", entityType: "Product", entityId: productId, description: `Xuất kho ${quantity}` } });
    }

    if (mode === "adjust") {
      const actualQuantity = numberValue(formData, "actualQuantity");
      if (actualQuantity < inventory.reservedQuantity) throw new Error("Tồn thực tế không được nhỏ hơn số lượng đang giữ.");
      const delta = Math.abs(actualQuantity - inventory.quantity);
      await tx.inventory.update({ where: { productId }, data: { quantity: actualQuantity } });
      await tx.inventoryTransaction.create({ data: { productId, type: "ADJUST", quantity: delta, beforeQuantity: inventory.quantity, afterQuantity: actualQuantity, note } });
      await tx.activityLog.create({ data: { userId: user.id, action: "ADJUST_STOCK", entityType: "Product", entityId: productId, description: `Điều chỉnh tồn từ ${inventory.quantity} thành ${actualQuantity}` } });
    }
  });

  return NextResponse.redirect(publicUrl(request, "/admin/inventory"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
