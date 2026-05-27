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
  createdAt: string;
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
    },
  });
  if (!order) return null;

  return {
    orderCode: order.orderCode,
    customerName: order.customer?.name || "Khách lẻ",
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    shippingFee: Number(order.shippingFee),
    discount: Number(order.discount),
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      total: Number(item.total),
    })),
  };
}
