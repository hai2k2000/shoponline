import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type OrderStatus = "NEW" | "CONFIRMED" | "PACKING" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "RETURNED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/orders"), { status: 303 });
  const id = text(formData, "id");
  const nextStatus = text(formData, "status") as OrderStatus;
  if (!id || !["NEW", "CONFIRMED", "PACKING", "SHIPPING", "COMPLETED", "CANCELLED", "RETURNED"].includes(nextStatus)) return NextResponse.redirect(publicUrl(request, "/admin/orders"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (order.orderStatus === nextStatus) return;
    if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new Error("Đơn hàng đã kết thúc, không thể đổi trạng thái.");

    if (nextStatus === "CANCELLED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (!inventory) continue;
        await tx.inventory.update({ where: { productId: item.productId }, data: { reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity) } });
      }
    }

    if (nextStatus === "COMPLETED" && order.orderStatus !== "COMPLETED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (!inventory || inventory.quantity < item.quantity) throw new Error("Không đủ tồn để hoàn tất đơn.");
        const afterQuantity = inventory.quantity - item.quantity;
        await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity, reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity) } });
        await tx.inventoryTransaction.create({ data: { productId: item.productId, type: "EXPORT", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Xuất kho đơn ${order.orderCode}` } });
      }
      if (order.customerId) await tx.customer.update({ where: { id: order.customerId }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: order.total } } });
    }

    if (nextStatus === "RETURNED" && order.orderStatus === "COMPLETED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.upsert({ where: { productId: item.productId }, update: {}, create: { productId: item.productId, quantity: 0, reservedQuantity: 0 } });
        const afterQuantity = inventory.quantity + item.quantity;
        await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
        await tx.inventoryTransaction.create({ data: { productId: item.productId, type: "RETURN", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Hoàn kho đơn ${order.orderCode}` } });
      }
      if (order.customerId) await tx.customer.update({ where: { id: order.customerId }, data: { totalOrders: { decrement: 1 }, totalSpent: { decrement: order.total } } });
    }

    await tx.order.update({ where: { id }, data: { orderStatus: nextStatus } });
    await tx.activityLog.create({ data: { userId: user.id, action: "UPDATE_ORDER_STATUS", entityType: "Order", entityId: order.id, description: `Đổi trạng thái ${order.orderCode} sang ${nextStatus}` } });
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
