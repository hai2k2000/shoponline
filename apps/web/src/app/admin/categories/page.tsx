import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
  });

  return (
    <CategoriesClient
      sessionToken={sessionToken}
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
