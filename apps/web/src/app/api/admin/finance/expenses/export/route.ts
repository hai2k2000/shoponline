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
  const category = params.get("category") || "";
  const status = params.get("status") || "";

  const rows = await prisma.expense.findMany({ orderBy: [{ updatedAt: "desc" }] });

  const filtered = rows.filter((row) => {
    const values = [row.title, row.category, row.note || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesCategory = !category || row.category === category;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const header = ["title", "category", "status", "amount", "createdAt", "updatedAt", "note"];
  const body = filtered.map((row) => [
    row.title,
    row.category,
    row.status,
    Number(row.amount),
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.note || "",
  ]);
  return csvExportResponse("shoponline-expenses", [header, ...body]);
}
