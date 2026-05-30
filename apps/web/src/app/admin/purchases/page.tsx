import { prisma } from "@/lib/prisma";
import { PurchasesClient } from "./PurchasesClient";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ productId?: string; quantity?: string; note?: string; search?: string }> }) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [purchases, suppliers, products] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { select: { productId: true, productName: true, sku: true, quantity: true, costPrice: true, total: true } },
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
        supplierId: row.supplier?.id || null,
        supplier: row.supplier?.name || "Chưa chọn",
        status: row.status,
        total: Number(row.total),
        expectedAt: row.expectedAt?.toISOString() || null,
        receivedAt: row.receivedAt?.toISOString() || null,
        note: row.note,
        items: row.items.map((item) => ({ productId: item.productId, productName: item.productName, sku: item.sku, quantity: item.quantity, costPrice: Number(item.costPrice), total: Number(item.total) })),
      }))}
      suppliers={suppliers}
      products={products.map((row) => ({ id: row.id, name: row.name, sku: row.sku, costPrice: Number(row.costPrice) }))}
      sessionToken={sessionToken}
      initialProductId={params.productId || ""}
      initialQuery={params.search || ""}
      initialQuantity={Math.max(1, Number(params.quantity || 1) || 1)}
      initialNote={params.note || ""}
      initialOpen={Boolean(params.productId)}
    />
  );
}
