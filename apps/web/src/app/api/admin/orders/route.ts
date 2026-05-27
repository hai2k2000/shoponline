import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function numberValue(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function orderCode() { const now = new Date(); return `SO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`; }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/orders"), { status: 303 });
  const productId = text(formData, "productId");
  const quantity = Math.max(1, Math.floor(numberValue(formData, "quantity")));
  const customerId = text(formData, "customerId") || null;
  const shippingFee = numberValue(formData, "shippingFee");
  const discount = numberValue(formData, "discount");
  const note = text(formData, "note") || null;
  if (!productId || quantity <= 0) return NextResponse.redirect(publicUrl(request, "/admin/orders"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, include: { inventory: true } });
    if (!product || product.status === "ARCHIVED") throw new Error("Sản phẩm không hợp lệ.");
    const inventory = product.inventory || await tx.inventory.create({ data: { productId, quantity: 0, reservedQuantity: 0 } });
    const available = inventory.quantity - inventory.reservedQuantity;
    if (quantity > available) throw new Error("Không đủ tồn khả dụng để tạo đơn.");
    const salePrice = Number(product.salePrice);
    const costPrice = Number(product.costPrice);
    const subtotal = salePrice * quantity;
    const total = Math.max(0, subtotal + shippingFee - discount);
    const order = await tx.order.create({
      data: {
        orderCode: orderCode(),
        customerId,
        subtotal,
        shippingFee,
        discount,
        total,
        paymentStatus: total > 0 ? "UNPAID" : "PAID",
        orderStatus: "NEW",
        note,
        items: { create: [{ productId, productName: product.name, sku: product.sku, quantity, costPrice, salePrice, total: subtotal }] },
      },
    });
    await tx.inventory.update({ where: { productId }, data: { reservedQuantity: inventory.reservedQuantity + quantity } });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_ORDER", entityType: "Order", entityId: order.id, description: `Tạo đơn hàng ${order.orderCode}` } });
    if (customerId) {
      await tx.customerTimeline.create({ data: { customerId, type: "ORDER", title: `Tạo đơn hàng ${order.orderCode}`, note: note || `Giá trị đơn ${total}`, createdById: user.id } });
    }
  });
  return NextResponse.redirect(publicUrl(request, "/admin/orders"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
