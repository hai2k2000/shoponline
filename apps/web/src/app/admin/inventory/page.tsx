import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { InventoryClient } from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [products, transactions] = await Promise.all([
    prisma.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ updatedAt: "desc" }],
      include: { category: { select: { name: true } }, inventory: true },
    }),
    prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { product: { select: { name: true, sku: true } } },
    }),
  ]);

  return (
    <InventoryClient
      sessionToken={sessionToken}
      rows={products.map((row) => ({
        productId: row.id,
        name: row.name,
        sku: row.sku,
        categoryName: row.category?.name || null,
        costPrice: Number(row.costPrice),
        salePrice: Number(row.salePrice),
        minStock: row.minStock,
        status: row.status,
        quantity: row.inventory?.quantity || 0,
        reservedQuantity: row.inventory?.reservedQuantity || 0,
        updatedAt: row.updatedAt.toISOString(),
      }))}
      transactions={transactions.map((item) => ({
        id: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        type: item.type,
        quantity: item.quantity,
        beforeQuantity: item.beforeQuantity,
        afterQuantity: item.afterQuantity,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}
