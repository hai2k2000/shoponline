import type { PrismaClient } from "@prisma/client";

export type TrackingOrder = {
  orderCode: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
  latestShipment: {
    carrier: string;
    service: string | null;
    trackingCode: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
};

export async function findTrackingOrder(db: PrismaClient, code: string): Promise<TrackingOrder | null> {
  const orderCode = code.trim().toUpperCase();
  if (!orderCode) return null;

  const order = await db.order.findUnique({
    where: { orderCode },
    include: {
      customer: { select: { name: true } },
      items: { orderBy: { id: "asc" } },
      payments: { select: { amount: true } },
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) return null;

  const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const total = Number(order.total);
  const latestShipment = order.shipments[0] || null;

  return {
    orderCode: order.orderCode,
    customerName: order.customer?.name || "Khách lẻ",
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    discount: Number(order.discount),
    total,
    paid,
    remaining: Math.max(0, total - paid),
    createdAt: order.createdAt.toISOString(),
    latestShipment: latestShipment ? {
      carrier: latestShipment.carrier,
      service: latestShipment.service,
      trackingCode: latestShipment.trackingCode,
      status: latestShipment.status,
      shippedAt: latestShipment.shippedAt?.toISOString() || null,
      deliveredAt: latestShipment.deliveredAt?.toISOString() || null,
    } : null,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      total: Number(item.total),
    })),
  };
}
