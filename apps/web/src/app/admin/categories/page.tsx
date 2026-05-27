import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
  });

  return (
    <CategoriesClient
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
      }))}
    />
  );
}
