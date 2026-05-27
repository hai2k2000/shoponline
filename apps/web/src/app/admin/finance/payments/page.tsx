import { prisma } from "@/lib/prisma";
import { PaymentsClient } from "./PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: { orderStatus: { notIn: ["CANCELLED", "RETURNED"] } },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
    }),
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: { select: { orderCode: true, customer: { select: { name: true } } } }, receivedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <PaymentsClient
      orders={orders.map((order) => {
        const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const total = Number(order.total);
        return { id: order.id, orderCode: order.orderCode, customer: order.customer?.name || "Khách lẻ", total, paid, remaining: Math.max(0, total - paid), paymentStatus: order.paymentStatus };
      })}
      payments={payments.map((payment) => ({ id: payment.id, orderCode: payment.order.orderCode, customer: payment.order.customer?.name || "Khách lẻ", amount: Number(payment.amount), method: payment.method, reference: payment.reference, note: payment.note, receivedBy: payment.receivedBy?.name || null, createdAt: payment.createdAt.toISOString() }))}
    />
  );
}
