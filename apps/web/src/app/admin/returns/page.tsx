import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { ReturnsClient } from "./ReturnsClient";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [returns, orders] = await Promise.all([
    prisma.returnRequest.findMany({
      orderBy: { updatedAt: "desc" },
      include: { order: { select: { orderCode: true, customer: { select: { name: true } } } } },
    }),
    prisma.order.findMany({
      where: { orderStatus: { in: ["COMPLETED", "SHIPPING"] } },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { name: true } }, payments: { select: { amount: true } } },
    }),
  ]);

  return (
    <ReturnsClient
      sessionToken={sessionToken}
      rows={returns.map((row) => ({
        id: row.id,
        code: row.code,
        orderCode: row.order.orderCode,
        customer: row.order.customer?.name || "Khách lẻ",
        status: row.status,
        reason: row.reason,
        refundAmount: Number(row.refundAmount),
        receivedAt: row.receivedAt?.toISOString() || null,
        refundedAt: row.refundedAt?.toISOString() || null,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      }))}
      orders={orders.map((row) => ({
        id: row.id,
        orderCode: row.orderCode,
        customer: row.customer?.name || "Khách lẻ",
        total: Number(row.total),
        paid: row.payments.reduce((sum, item) => sum + Number(item.amount), 0),
        orderStatus: row.orderStatus,
      }))}
    />
  );
}
