import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/admin-api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { csvExportResponse } from "@/lib/csv-export";


export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings:write")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.automationRun.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
  const header = ["createdAt", "jobType", "status", "summary", "details", "runId"];
  const body = rows.map((row) => [
    row.createdAt.toISOString(),
    row.jobType,
    row.status,
    row.summary,
    JSON.stringify(row.details || {}),
    row.id,
  ]);
  return csvExportResponse("shoponline-automation", [header, ...body]);
}
