import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      parent: { select: { name: true } },
      products: {
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          name: true,
          sku: true,
          status: true,
          salePrice: true,
          promotionPrice: true,
          updatedAt: true,
          inventory: { select: { quantity: true, reservedQuantity: true } },
        },
      },
      _count: { select: { products: true } },
    },
  });

  return (
    <CategoriesClient
      sessionToken={sessionToken}
      initialQuery={params.search || ""}
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
        parentId: row.parentId,
        parentName: row.parent?.name || null,
        productCount: row._count.products,
        products: row.products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: product.status,
          salePrice: Number(product.salePrice),
          promotionPrice: product.promotionPrice === null ? null : Number(product.promotionPrice),
          quantity: product.inventory?.quantity || 0,
          reservedQuantity: product.inventory?.reservedQuantity || 0,
          updatedAt: product.updatedAt.toISOString(),
        })),
      }))}
    />
  );
}
