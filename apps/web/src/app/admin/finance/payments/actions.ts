"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function money(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

export async function createPaymentAction(formData: FormData) {
  const user = await requireUser();
  const orderId = text(formData, "orderId");
  const amount = money(formData, "amount");
  if (!orderId || amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new Error("Không thể thu tiền đơn đã hủy hoặc trả hàng.");
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const remaining = Math.max(0, Number(order.total) - paid);
    if (amount > remaining) throw new Error("Số tiền thu vượt quá số còn lại.");

    const payment = await tx.paymentTransaction.create({
      data: {
        orderId,
        amount,
        method: text(formData, "method") || "CASH",
        reference: text(formData, "reference") || null,
        note: text(formData, "note") || null,
        receivedById: user.id,
      },
    });

    const nextPaid = paid + amount;
    const paymentStatus = nextPaid >= Number(order.total) ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus } });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_PAYMENT", entityType: "PaymentTransaction", entityId: payment.id, description: `Thu ${amount} cho đơn ${order.orderCode}` } });
  });

  revalidatePath("/admin/finance/payments");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
}
