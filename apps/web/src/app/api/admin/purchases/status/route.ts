import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/purchases"), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/purchases"), { status: 303 });
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!id || !["RECEIVED", "CANCELLED"].includes(status)) return back(request);

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!purchase) throw new Error("Không tìm thấy đơn nhập.");
    if (["RECEIVED", "CANCELLED"].includes(purchase.status)) return;

    if (status === "RECEIVED") {
      for (const item of purchase.items) {
        const inventory = await tx.inventory.upsert({
          where: { productId: item.productId },
          update: {},
          create: { productId: item.productId, quantity: 0, reservedQuantity: 0 },
        });
        const beforeQuantity = inventory.quantity;
        const afterQuantity = beforeQuantity + item.quantity;
        await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, type: "IMPORT", quantity: item.quantity, beforeQuantity, afterQuantity, note: `Nhập kho ${purchase.code}` },
        });
      }
      await tx.purchaseOrder.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } });
      await tx.notification.create({
        data: {
          userId: user.id,
          level: "SUCCESS",
          title: `Đã nhận hàng ${purchase.code}`,
          message: `Đã nhập ${purchase.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm vào kho.`,
          entityType: "PurchaseOrder",
          entityId: purchase.id,
        },
      });
    } else {
      await tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    }

    await tx.activityLog.create({ data: { userId: user.id, action: "UPDATE_PURCHASE_ORDER_STATUS", entityType: "PurchaseOrder", entityId: id, description: `Đổi trạng thái đơn nhập ${purchase.code} sang ${status}` } });
  });

  return back(request);
}

function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}
