import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "shipments:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.shipment.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { orderCode: true, orderStatus: true, customer: { select: { name: true, phone: true } } } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [
      row.order.orderCode,
      row.order.customer?.name || "",
      row.order.customer?.phone || "",
      row.carrier,
      row.service || "",
      row.trackingCode || "",
      row.note || "",
      row.createdBy?.name || "",
    ];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });

  const header = ["orderCode", "customer", "customerPhone", "orderStatus", "carrier", "service", "trackingCode", "shippingFee", "status", "shippedAt", "deliveredAt", "createdBy", "createdAt", "note"];
  const body = filtered.map((row) => [
    row.order.orderCode,
    row.order.customer?.name || "",
    row.order.customer?.phone || "",
    row.order.orderStatus,
    row.carrier,
    row.service || "",
    row.trackingCode || "",
    Number(row.shippingFee),
    row.status,
    row.shippedAt?.toISOString() || "",
    row.deliveredAt?.toISOString() || "",
    row.createdBy?.name || "",
    row.createdAt.toISOString(),
    row.note || "",
  ]);
  return csvExportResponse("shoponline-shipments", [header, ...body]);
}
