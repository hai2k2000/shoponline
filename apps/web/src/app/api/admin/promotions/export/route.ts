import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "promotions:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const status = params.get("status") || "";

  const rows = await prisma.promotion.findMany({ orderBy: { updatedAt: "desc" }, take: 2000 });

  const filtered = rows.filter((row) => {
    const values = [row.code, row.name, row.description || "", row.status];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!status || row.status === status);
  });

  const header = ["code", "name", "status", "discountType", "discountValue", "minOrder", "maxDiscount", "usageLimit", "usedCount", "startsAt", "endsAt", "createdAt", "updatedAt", "description", "promotionId"];
  const body = filtered.map((row) => [
    row.code,
    row.name,
    row.status,
    row.discountType,
    Number(row.discountValue),
    Number(row.minOrder),
    row.maxDiscount == null ? "" : Number(row.maxDiscount),
    row.usageLimit ?? "",
    row.usedCount,
    row.startsAt?.toISOString() || "",
    row.endsAt?.toISOString() || "",
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.description || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-promotions", [header, ...body]);
}
