import { NextResponse, type NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "notifications:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const search = (params.get("search") || "").trim().toLowerCase();
  const level = params.get("level") || "";
  const mode = params.get("mode") || "";

  const rows = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });

  const filtered = rows.filter((row) => {
    const values = [row.title, row.message || "", row.entityType || "", row.entityId || ""];
    const matchesSearch = !search || values.some((value) => value.toLowerCase().includes(search));
    const matchesLevel = !level || row.level === level;
    const matchesMode = !mode || (mode === "unread" ? !row.readAt : Boolean(row.readAt));
    return matchesSearch && matchesLevel && matchesMode;
  });

  const header = ["createdAt", "readAt", "level", "title", "message", "entityType", "entityId", "notificationId"];
  const body = filtered.map((row) => [
    row.createdAt.toISOString(),
    row.readAt?.toISOString() || "",
    row.level,
    row.title,
    row.message || "",
    row.entityType || "",
    row.entityId || "",
    row.id,
  ]);
  return csvExportResponse("shoponline-notifications", [header, ...body]);
}
