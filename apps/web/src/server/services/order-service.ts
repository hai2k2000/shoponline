import type { OrderStatus, Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type CreateOrderInput = {
  productId: string;
  quantity: number;
  customerId: string | null;
  shippingFee: number;
  discount: number;
  note: string | null;
};

export function orderCode() {
  const now = new Date();
  return `SO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

export async function createAdminOrder(tx: Prisma.TransactionClient, input: CreateOrderInput, userId: string) {
  const product = await tx.product.findUnique({ where: { id: input.productId }, include: { inventory: true } });
  if (!product || product.status === "ARCHIVED") throw new AdminFormError("BUSINESS_RULE_ERROR", "Sản phẩm không hợp lệ.");

  const inventory = product.inventory || await tx.inventory.create({ data: { productId: input.productId, quantity: 0, reservedQuantity: 0 } });
  const available = inventory.quantity - inventory.reservedQuantity;
  if (input.quantity > available) throw new AdminFormError("BUSINESS_RULE_ERROR", "Không đủ tồn khả dụng để tạo đơn.");

  const salePrice = Number(product.salePrice);
  const costPrice = Number(product.costPrice);
  const subtotal = salePrice * input.quantity;
  const total = Math.max(0, subtotal + input.shippingFee - input.discount);
  const order = await tx.order.create({
    data: {
      orderCode: orderCode(),
      customerId: input.customerId,
      subtotal,
      shippingFee: input.shippingFee,
      discount: input.discount,
      total,
      paymentStatus: total > 0 ? "UNPAID" : "PAID",
      orderStatus: "NEW",
      note: input.note,
      items: { create: [{ productId: input.productId, productName: product.name, sku: product.sku, quantity: input.quantity, costPrice, salePrice, total: subtotal }] },
    },
  });

  await tx.inventory.update({ where: { productId: input.productId }, data: { reservedQuantity: inventory.reservedQuantity + input.quantity } });
  await tx.activityLog.create({ data: { userId, action: "CREATE_ORDER", entityType: "Order", entityId: order.id, description: `Tạo đơn hàng ${order.orderCode}` } });
  if (input.customerId) {
    await tx.customerTimeline.create({ data: { customerId: input.customerId, type: "ORDER", title: `Tạo đơn hàng ${order.orderCode}`, note: input.note || `Giá trị đơn ${total}`, createdById: userId } });
  }
  return order;
}

export async function transitionOrderStatus(tx: Prisma.TransactionClient, id: string, nextStatus: OrderStatus, userId: string) {
  const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new AdminFormError("NOT_FOUND", "Không tìm thấy đơn hàng.");
  if (order.orderStatus === nextStatus) return order;
  if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) {
    throw new AdminFormError("BUSINESS_RULE_ERROR", "Đơn hàng đã kết thúc, không thể đổi trạng thái.");
  }

  if (nextStatus === "CANCELLED") {
    for (const item of order.items) {
      if (!item.productId) continue;
      const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
      if (!inventory) continue;
      await tx.inventory.update({ where: { productId: item.productId }, data: { reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity) } });
    }
  }

  if (nextStatus === "COMPLETED") {
    for (const item of order.items) {
      if (!item.productId) continue;
      const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
      if (!inventory || inventory.quantity < item.quantity) throw new AdminFormError("BUSINESS_RULE_ERROR", "Không đủ tồn để hoàn tất đơn.");
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

  const updated = await tx.order.update({ where: { id }, data: { orderStatus: nextStatus } });
  await tx.activityLog.create({ data: { userId, action: "UPDATE_ORDER_STATUS", entityType: "Order", entityId: order.id, description: `Đổi trạng thái ${order.orderCode} sang ${nextStatus}` } });
  return updated;
}
