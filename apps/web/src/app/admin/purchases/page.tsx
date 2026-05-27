import { prisma } from "@/lib/prisma";
import { PurchasesClient } from "./PurchasesClient";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [purchases, suppliers, products] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        items: { select: { productName: true, sku: true, quantity: true, costPrice: true, total: true } },
      },
    }),
    prisma.supplier.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, costPrice: true } }),
  ]);

  return (
    <PurchasesClient
      rows={purchases.map((row) => ({
        id: row.id,
        code: row.code,
        supplier: row.supplier?.name || "Chưa chọn",
        status: row.status,
        total: Number(row.total),
        expectedAt: row.expectedAt?.toISOString() || null,
        receivedAt: row.receivedAt?.toISOString() || null,
        note: row.note,
        items: row.items.map((item) => ({ productName: item.productName, sku: item.sku, quantity: item.quantity, costPrice: Number(item.costPrice), total: Number(item.total) })),
      }))}
      suppliers={suppliers}
      products={products.map((row) => ({ id: row.id, name: row.name, sku: row.sku, costPrice: Number(row.costPrice) }))}
      sessionToken={sessionToken}
    />
  );
}
