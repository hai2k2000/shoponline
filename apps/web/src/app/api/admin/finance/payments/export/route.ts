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
  const method = params.get("method") || "";

  const rows = await prisma.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderCode: true, paymentStatus: true, total: true, customer: { select: { name: true, phone: true } } } },
      receivedBy: { select: { name: true, email: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [
      row.order.orderCode,
      row.order.customer?.name || "",
      row.order.customer?.phone || "",
      row.method,
      row.reference || "",
      row.note || "",
      row.receivedBy?.name || "",
      row.receivedBy?.email || "",
    ];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesMethod = !method || row.method === method;
    return matchesSearch && matchesMethod;
  });

  const header = ["orderCode", "customer", "customerPhone", "orderTotal", "paymentStatus", "amount", "method", "reference", "receivedBy", "receivedByEmail", "createdAt", "note"];
  const body = filtered.map((row) => [
    row.order.orderCode,
    row.order.customer?.name || "",
    row.order.customer?.phone || "",
    Number(row.order.total),
    row.order.paymentStatus,
    Number(row.amount),
    row.method,
    row.reference || "",
    row.receivedBy?.name || "",
    row.receivedBy?.email || "",
    row.createdAt.toISOString(),
    row.note || "",
  ]);
  return csvExportResponse("shoponline-payments", [header, ...body]);
}
