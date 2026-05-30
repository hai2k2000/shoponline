import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "customers:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const source = params.get("source") || "";
  const group = params.get("group") || "";
  const status = params.get("status") || "";

  const rows = await prisma.customer.findMany({ orderBy: [{ updatedAt: "desc" }] });

  const filtered = rows.filter((row) => {
    const values = [row.name, row.phone || "", row.email || "", row.address || "", row.source || "", row.group || "", row.notes || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesSource = !source || row.source === source;
    const matchesGroup = !group || row.group === group;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesSource && matchesGroup && matchesStatus;
  });

  const header = ["name", "phone", "email", "address", "source", "group", "status", "totalOrders", "totalSpent", "updatedAt", "notes"];
  const body = filtered.map((row) => [
    row.name,
    row.phone || "",
    row.email || "",
    row.address || "",
    row.source || "",
    row.group || "",
    row.status,
    row.totalOrders,
    Number(row.totalSpent),
    row.updatedAt.toISOString(),
    row.notes || "",
  ]);
  return csvExportResponse("shoponline-customers", [header, ...body]);
}
