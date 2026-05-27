import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [rows, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: { category: { select: { name: true } }, inventory: true },
    }),
    prisma.category.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  return (
    <ProductsClient
      categories={categories}
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        shortDescription: row.shortDescription,
        description: row.description,
        thumbnail: row.thumbnail,
        costPrice: Number(row.costPrice),
        salePrice: Number(row.salePrice),
        promotionPrice: row.promotionPrice === null ? null : Number(row.promotionPrice),
        minStock: row.minStock,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
        categoryId: row.categoryId,
        categoryName: row.category?.name || null,
        quantity: row.inventory?.quantity || 0,
        reservedQuantity: row.inventory?.reservedQuantity || 0,
      }))}
    />
  );
}
