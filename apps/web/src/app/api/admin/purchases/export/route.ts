import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "purchases:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.purchaseOrder.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      items: { select: { productName: true, sku: true, quantity: true, costPrice: true, total: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [row.code, row.supplier?.name || "", row.note || "", ...row.items.map((item) => item.productName), ...row.items.map((item) => item.sku || "")];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const header = ["code", "supplier", "status", "productName", "sku", "quantity", "costPrice", "itemTotal", "orderTotal", "expectedAt", "receivedAt", "note"];
  const body = filtered.flatMap((row) => row.items.map((item) => [
    row.code,
    row.supplier?.name || "",
    row.status,
    item.productName,
    item.sku || "",
    item.quantity,
    Number(item.costPrice),
    Number(item.total),
    Number(row.total),
    row.expectedAt?.toISOString() || "",
    row.receivedAt?.toISOString() || "",
    row.note || "",
  ]));
  return csvExportResponse("shoponline-purchases", [header, ...body]);
}
