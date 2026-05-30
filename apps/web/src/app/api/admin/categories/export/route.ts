import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "categories:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      parent: { select: { name: true } },
      products: { orderBy: { updatedAt: "desc" }, select: { sku: true } },
      _count: { select: { products: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [row.name, row.slug, row.parent?.name || "", row.description || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!status || row.status === status);
  });

  const header = ["name", "slug", "parent", "status", "sortOrder", "productCount", "productSkus", "updatedAt", "description", "categoryId"];
  const body = filtered.map((row) => [
    row.name,
    row.slug,
    row.parent?.name || "",
    row.status,
    row.sortOrder,
    row._count.products,
    row.products.map((product) => product.sku).join("; "),
    row.updatedAt.toISOString(),
    row.description || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-categories", [header, ...body]);
}
