import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "returns:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: { order: { select: { orderCode: true, customer: { select: { name: true, phone: true, email: true } } } } },
  });

  const filtered = rows.filter((row) => {
    const values = [row.code, row.order.orderCode, row.order.customer?.name || "", row.order.customer?.phone || "", row.reason, row.note || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!status || row.status === status);
  });

  const header = ["code", "orderCode", "customer", "customerPhone", "customerEmail", "status", "reason", "refundAmount", "receivedAt", "refundedAt", "createdAt", "updatedAt", "note", "returnId"];
  const body = filtered.map((row) => [
    row.code,
    row.order.orderCode,
    row.order.customer?.name || "",
    row.order.customer?.phone || "",
    row.order.customer?.email || "",
    row.status,
    row.reason,
    Number(row.refundAmount),
    row.receivedAt?.toISOString() || "",
    row.refundedAt?.toISOString() || "",
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.note || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-returns", [header, ...body]);
}
