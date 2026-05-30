import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "suppliers:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.supplier.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      debts: { select: { amount: true, paidAmount: true, status: true } },
      purchases: { select: { id: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [row.name, row.phone || "", row.email || "", row.address || "", row.taxCode || "", row.note || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const header = ["name", "phone", "email", "address", "taxCode", "status", "openDebt", "debtCount", "purchaseCount", "note"];
  const body = filtered.map((row) => [
    row.name,
    row.phone || "",
    row.email || "",
    row.address || "",
    row.taxCode || "",
    row.status,
    row.debts.reduce((sum, debt) => sum + (debt.status === "OPEN" ? Number(debt.amount) - Number(debt.paidAmount) : 0), 0),
    row.debts.length,
    row.purchases.length,
    row.note || "",
  ]);
  return csvExportResponse("shoponline-suppliers", [header, ...body]);
}
