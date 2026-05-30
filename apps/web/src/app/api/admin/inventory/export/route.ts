import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "inventory:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const stock = params.get("stock") || "";

  const rows = await prisma.product.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: { select: { name: true } },
      inventory: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const quantity = row.inventory?.quantity || 0;
    const reserved = row.inventory?.reservedQuantity || 0;
    const available = quantity - reserved;
    const matchesSearch = !search || [row.name, row.sku, row.category?.name || ""].some((value) => value.toLowerCase().includes(search));
    const lastTransactionAt = row.transactions[0]?.createdAt || null;
    const isStale = lastTransactionAt && (quantity > 0 || reserved > 0) && Date.now() - lastTransactionAt.getTime() > 30 * 24 * 60 * 60 * 1000;
    const matchesStock = !stock || (stock === "LOW" ? quantity <= row.minStock : stock === "OUT" ? available <= 0 : stock === "RESERVED" ? reserved > 0 : stock === "NEGATIVE" ? available < 0 : stock === "STALE" ? Boolean(isStale) : stock === "NO_TRANSACTION" ? !lastTransactionAt : available > 0);
    return matchesSearch && matchesStock;
  });

  const header = ["name", "sku", "category", "status", "quantity", "reservedQuantity", "available", "minStock", "costPrice", "salePrice", "inventoryValue", "lastTransactionAt", "updatedAt"];
  const body = filtered.map((row) => {
    const quantity = row.inventory?.quantity || 0;
    const reserved = row.inventory?.reservedQuantity || 0;
    return [
      row.name,
      row.sku,
      row.category?.name || "",
      row.status,
      quantity,
      reserved,
      quantity - reserved,
      row.minStock,
      Number(row.costPrice),
      Number(row.salePrice),
      quantity * Number(row.costPrice),
      row.transactions[0]?.createdAt.toISOString() || "",
      row.updatedAt.toISOString(),
    ];
  });
  return csvExportResponse("shoponline-inventory", [header, ...body]);
}
