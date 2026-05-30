import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "orders:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";
  const payment = params.get("payment") || "";

  const rows = await prisma.order.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      items: { select: { productName: true, sku: true, quantity: true, salePrice: true, total: true } },
      payments: { select: { amount: true } },
      shipments: { select: { status: true, carrier: true, trackingCode: true }, orderBy: { createdAt: "desc" } },
    },
  });

  const filtered = rows.filter((row) => {
    const productsText = row.items.map((item) => `${item.productName} ${item.sku || ""}`).join(" ");
    const values = [row.orderCode, row.customer?.name || "", row.customer?.phone || "", row.customer?.email || "", row.note || "", productsText];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesStatus = !status || row.orderStatus === status;
    const matchesPayment = !payment || row.paymentStatus === payment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const header = [
    "orderCode",
    "customer",
    "customerPhone",
    "customerEmail",
    "orderStatus",
    "paymentStatus",
    "total",
    "paid",
    "remaining",
    "itemCount",
    "items",
    "latestShipmentStatus",
    "latestCarrier",
    "latestTrackingCode",
    "createdAt",
    "updatedAt",
    "note",
  ];
  const body = filtered.map((row) => {
    const paid = row.payments.reduce((sum, paymentRow) => sum + Number(paymentRow.amount), 0);
    const total = Number(row.total);
    const latestShipment = row.shipments[0];
    return [
      row.orderCode,
      row.customer?.name || "",
      row.customer?.phone || "",
      row.customer?.email || "",
      row.orderStatus,
      row.paymentStatus,
      total,
      paid,
      Math.max(0, total - paid),
      row.items.reduce((sum, item) => sum + item.quantity, 0),
      row.items.map((item) => `${item.productName}${item.sku ? ` (${item.sku})` : ""} x${item.quantity}`).join("; "),
      latestShipment?.status || "",
      latestShipment?.carrier || "",
      latestShipment?.trackingCode || "",
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
      row.note || "",
    ];
  });
  return csvExportResponse("shoponline-orders", [header, ...body]);
}
