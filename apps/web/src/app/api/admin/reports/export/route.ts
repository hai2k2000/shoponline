import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";
import { getReportsData } from "@/server/services/reporting-service";

type ReportTab = "sales" | "products" | "inventory" | "debts";

const validTabs = new Set<ReportTab>(["sales", "products", "inventory", "debts"]);


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "finance:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tabParam = request.nextUrl.searchParams.get("tab") || "sales";
  const tab = validTabs.has(tabParam as ReportTab) ? (tabParam as ReportTab) : "sales";
  const reports = await getReportsData(prisma);

  const report = (() => {
    if (tab === "products") {
      return {
        filename: "shoponline-report-products",
        header: ["product", "sku", "quantity", "revenue", "profit"],
        rows: reports.productSalesRows.map((row) => [row.product, row.sku, row.quantity, row.revenue, row.profit]),
      };
    }
    if (tab === "inventory") {
      return {
        filename: "shoponline-report-inventory",
        header: ["product", "sku", "quantity", "reservedQuantity", "available", "value", "minStock"],
        rows: reports.inventoryRows.map((row) => [row.product, row.sku, row.quantity, row.reservedQuantity, row.available, row.value, row.minStock]),
      };
    }
    if (tab === "debts") {
      return {
        filename: "shoponline-report-debts",
        header: ["type", "party", "amount", "paidAmount", "remaining", "status"],
        rows: reports.debtRows.map((row) => [row.type, row.party, row.amount, row.paidAmount, row.remaining, row.status]),
      };
    }
    return {
      filename: "shoponline-report-sales",
      header: ["orderCode", "customer", "status", "total", "createdAt"],
      rows: reports.salesRows.map((row) => [row.orderCode, row.customer, row.status, row.total, row.createdAt]),
    };
  })();

  return csvExportResponse(report.filename, [report.header, ...report.rows]);
}
