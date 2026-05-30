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
  const type = params.get("type") || "";

  const rows = await prisma.customerTimeline.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  const filtered = rows.filter((row) => {
    const values = [row.customer.name, row.customer.phone || "", row.customer.email || "", row.title, row.note || "", row.type, row.createdBy?.name || "", row.createdBy?.email || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!type || row.type === type);
  });

  const header = ["createdAt", "customer", "phone", "email", "type", "title", "note", "createdBy", "createdByEmail", "timelineId"];
  const body = filtered.map((row) => [
    row.createdAt.toISOString(),
    row.customer.name,
    row.customer.phone || "",
    row.customer.email || "",
    row.type,
    row.title,
    row.note || "",
    row.createdBy?.name || "",
    row.createdBy?.email || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-customer-timeline", [header, ...body]);
}
