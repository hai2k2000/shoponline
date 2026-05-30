import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "users:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const entityType = params.get("entityType") || "";

  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: { user: { select: { name: true, email: true } } },
  });

  const filtered = rows.filter((row) => {
    const actor = row.user?.name || row.user?.email || "";
    const values = [actor, row.action, row.entityType, row.entityId || "", row.description || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!entityType || row.entityType === entityType);
  });

  const header = ["createdAt", "user", "userEmail", "action", "entityType", "entityId", "description", "logId"];
  const body = filtered.map((row) => [
    row.createdAt.toISOString(),
    row.user?.name || "",
    row.user?.email || "",
    row.action,
    row.entityType,
    row.entityId || "",
    row.description || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-audit", [header, ...body]);
}
