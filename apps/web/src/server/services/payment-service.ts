import type { Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type RecordPaymentInput = {
  orderId: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
};

export async function recordPayment(tx: Prisma.TransactionClient, input: RecordPaymentInput, userId: string) {
  const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { payments: true } });
  if (!order) throw new AdminFormError("NOT_FOUND", "Không tìm thấy đơn hàng.");
  if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) {
    throw new AdminFormError("BUSINESS_RULE_ERROR", "Không thể thu tiền đơn đã hủy hoặc trả hàng.");
  }

  const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = Math.max(0, Number(order.total) - paid);
  if (input.amount > remaining) throw new AdminFormError("BUSINESS_RULE_ERROR", "Số tiền thu vượt quá số còn lại.");

  const payment = await tx.paymentTransaction.create({
    data: {
      orderId: input.orderId,
      amount: input.amount,
      method: input.method || "CASH",
      reference: input.reference,
      note: input.note,
      receivedById: userId,
    },
  });

  const nextPaid = paid + input.amount;
  const paymentStatus = nextPaid >= Number(order.total) ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";
  await tx.order.update({ where: { id: input.orderId }, data: { paymentStatus } });
  await tx.activityLog.create({ data: { userId, action: "CREATE_PAYMENT", entityType: "PaymentTransaction", entityId: payment.id, description: `Thu ${input.amount} cho đơn ${order.orderCode}` } });
  return payment;
}
