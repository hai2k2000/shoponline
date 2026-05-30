import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "products:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const categoryId = params.get("categoryId") || "";
  const status = params.get("status") || "";
  const stock = params.get("stock") || "";

  const rows = await prisma.product.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: { category: { select: { name: true } }, inventory: true },
  });

  const filtered = rows.filter((row) => {
    const quantity = row.inventory?.quantity || 0;
    const reserved = row.inventory?.reservedQuantity || 0;
    const available = quantity - reserved;
    const matchesSearch = !search || [row.name, row.sku, row.slug, row.category?.name || "", row.shortDescription || ""].some((value) => value.toLowerCase().includes(search));
    const matchesCategory = !categoryId || row.categoryId === categoryId;
    const matchesStatus = !status || row.status === status;
    const matchesStock = !stock || (stock === "available" ? available > 0 : stock === "low" ? quantity <= row.minStock : available <= 0);
    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  const header = ["name", "sku", "category", "status", "costPrice", "salePrice", "promotionPrice", "quantity", "reservedQuantity", "available", "minStock", "updatedAt"];
  const body = filtered.map((row) => {
    const quantity = row.inventory?.quantity || 0;
    const reserved = row.inventory?.reservedQuantity || 0;
    return [
      row.name,
      row.sku,
      row.category?.name || "",
      row.status,
      Number(row.costPrice),
      Number(row.salePrice),
      row.promotionPrice === null ? "" : Number(row.promotionPrice),
      quantity,
      reserved,
      quantity - reserved,
      row.minStock,
      row.updatedAt.toISOString(),
    ];
  });
  return csvExportResponse("shoponline-products", [header, ...body]);
}
