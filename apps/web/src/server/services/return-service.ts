import type { Prisma, ReturnStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type CreateReturnInput = {
  orderId: string;
  refundAmount: number;
  reason: string;
  note: string | null;
};

export function returnCode() {
  const now = new Date();
  return `RT${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

export async function createReturnRequest(tx: Prisma.TransactionClient, input: CreateReturnInput, userId: string) {
  const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { payments: true } });
  if (!order) throw new AdminFormError("NOT_FOUND", "Không tìm thấy đơn hàng.");
  if (!["COMPLETED", "SHIPPING"].includes(order.orderStatus)) throw new AdminFormError("BUSINESS_RULE_ERROR", "Chỉ tạo trả hàng cho đơn đã giao hoặc đang giao.");

  const paid = order.payments.reduce((sum, item) => sum + Number(item.amount), 0);
  const refundAmount = Math.min(input.refundAmount, paid || Number(order.total));
  const request = await tx.returnRequest.create({
    data: {
      code: returnCode(),
      orderId: input.orderId,
      reason: input.reason || "Khác",
      refundAmount,
      note: input.note,
      createdById: userId,
    },
  });
  await tx.activityLog.create({ data: { userId, action: "CREATE_RETURN_REQUEST", entityType: "ReturnRequest", entityId: request.id, description: `Tạo yêu cầu trả hàng ${request.code}` } });
  await tx.notification.create({ data: { userId, level: "WARNING", title: `Yêu cầu trả hàng ${request.code}`, message: `Đơn ${order.orderCode} cần xử lý trả hàng.`, entityType: "ReturnRequest", entityId: request.id } });
  return request;
}

export async function transitionReturnStatus(tx: Prisma.TransactionClient, id: string, status: ReturnStatus, userId: string) {
  const row = await tx.returnRequest.findUnique({ where: { id }, include: { order: { include: { items: true } }, refunds: true } });
  if (!row) throw new AdminFormError("NOT_FOUND", "Không tìm thấy yêu cầu trả hàng.");
  if (["REFUNDED", "REJECTED"].includes(row.status)) return row;
  if (status === "APPROVED" && row.status !== "REQUESTED") return row;
  if (status === "RECEIVED" && row.status !== "APPROVED") return row;
  if (status === "REFUNDED" && row.status !== "RECEIVED") return row;

  if (status === "RECEIVED" && row.order.orderStatus === "COMPLETED") {
    for (const item of row.order.items) {
      if (!item.productId) continue;
      const inventory = await tx.inventory.upsert({ where: { productId: item.productId }, update: {}, create: { productId: item.productId, quantity: 0, reservedQuantity: 0 } });
      const afterQuantity = inventory.quantity + item.quantity;
      await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
      await tx.inventoryTransaction.create({ data: { productId: item.productId, type: "RETURN", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Hoàn kho ${row.code}` } });
    }
  }

  if (status === "REFUNDED") {
    const alreadyRefunded = row.refunds.reduce((sum, item) => sum + Number(item.amount), 0);
    const amount = Math.max(0, Number(row.refundAmount) - alreadyRefunded);
    if (amount > 0) await tx.refundTransaction.create({ data: { returnRequestId: row.id, orderId: row.orderId, amount, method: "BANK_TRANSFER", note: `Hoàn tiền ${row.code}`, refundedById: userId } });
    await tx.order.update({ where: { id: row.orderId }, data: { orderStatus: "RETURNED", paymentStatus: "REFUNDED" } });
    if (row.order.customerId) {
      await tx.customerTimeline.create({ data: { customerId: row.order.customerId, type: "SUPPORT", title: `Hoàn tiền ${row.code}`, note: `Đã hoàn ${amount}`, createdById: userId } });
    }
  }

  await tx.returnRequest.update({ where: { id }, data: { status, receivedAt: status === "RECEIVED" ? new Date() : row.receivedAt, refundedAt: status === "REFUNDED" ? new Date() : row.refundedAt } });
  await tx.activityLog.create({ data: { userId, action: "UPDATE_RETURN_STATUS", entityType: "ReturnRequest", entityId: id, description: `Đổi trạng thái ${row.code} sang ${status}` } });
  return row;
}
