import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "finance:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const type = params.get("type") || "";
  const status = params.get("status") || "";

  const rows = await prisma.debt.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      customer: { select: { name: true, phone: true } },
      supplier: { select: { name: true, phone: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const partyName = row.customer?.name || row.supplier?.name || "";
    const partyPhone = row.customer?.phone || row.supplier?.phone || "";
    const values = [partyName, partyPhone, row.note || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesType = !type || row.type === type;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  const header = ["partyName", "partyPhone", "type", "status", "amount", "paidAmount", "remaining", "dueDate", "createdAt", "note"];
  const body = filtered.map((row) => {
    const partyName = row.customer?.name || row.supplier?.name || "";
    const partyPhone = row.customer?.phone || row.supplier?.phone || "";
    const amount = Number(row.amount);
    const paidAmount = Number(row.paidAmount);
    return [
      partyName,
      partyPhone,
      row.type,
      row.status,
      amount,
      paidAmount,
      Math.max(0, amount - paidAmount),
      row.dueDate?.toISOString() || "",
      row.createdAt.toISOString(),
      row.note || "",
    ];
  });
  return csvExportResponse("shoponline-debts", [header, ...body]);
}
