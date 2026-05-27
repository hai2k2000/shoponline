import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { OrdersClient } from "./OrdersClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [orders, customers, products] = await Promise.all([
    prisma.order.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        customer: { select: { name: true } },
        items: { select: { productName: true, sku: true, quantity: true, salePrice: true, total: true } },
      },
    }),
    prisma.customer.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      include: { inventory: true },
    }),
  ]);

  return (
    <OrdersClient
      sessionToken={sessionToken}
      rows={orders.map((row) => ({
        id: row.id,
        orderCode: row.orderCode,
        customerName: row.customer?.name || "Khách lẻ",
        total: Number(row.total),
        paymentStatus: row.paymentStatus,
        orderStatus: row.orderStatus,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        items: row.items.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          salePrice: Number(item.salePrice),
          total: Number(item.total),
        })),
      }))}
      customers={customers}
      products={products.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        salePrice: Number(row.salePrice),
        available: (row.inventory?.quantity || 0) - (row.inventory?.reservedQuantity || 0),
      })).filter((row) => row.available > 0)}
    />
  );
}
