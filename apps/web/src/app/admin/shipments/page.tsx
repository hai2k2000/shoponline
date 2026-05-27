import { prisma } from "@/lib/prisma";
import { ShipmentsClient } from "./ShipmentsClient";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [shipments, orders] = await Promise.all([
    prisma.shipment.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        order: { select: { orderCode: true, customer: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { orderStatus: { notIn: ["CANCELLED", "RETURNED"] } },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return (
    <ShipmentsClient
      rows={shipments.map((row) => ({
        id: row.id,
        orderCode: row.order.orderCode,
        customer: row.order.customer?.name || "Khách lẻ",
        carrier: row.carrier,
        service: row.service,
        trackingCode: row.trackingCode,
        shippingFee: Number(row.shippingFee),
        status: row.status,
        shippedAt: row.shippedAt?.toISOString() || null,
        deliveredAt: row.deliveredAt?.toISOString() || null,
        note: row.note,
        createdBy: row.createdBy?.name || null,
        createdAt: row.createdAt.toISOString(),
      }))}
      orders={orders.map((row) => ({
        id: row.id,
        orderCode: row.orderCode,
        customer: row.customer?.name || "Khách lẻ",
        orderStatus: row.orderStatus,
        total: Number(row.total),
      }))}
      sessionToken={sessionToken}
    />
  );
}
