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
  const role = params.get("role") || "";
  const status = params.get("status") || "";

  const rows = await prisma.user.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
  });

  const filtered = rows.filter((row) => {
    const matchesSearch = !search || [row.name, row.email].some((value) => value.toLowerCase().includes(search));
    return matchesSearch && (!role || row.role === role) && (!status || row.status === status);
  });

  const header = ["name", "email", "role", "status", "createdAt", "updatedAt", "userId"];
  const body = filtered.map((row) => [row.name, row.email, row.role, row.status, row.createdAt.toISOString(), row.updatedAt.toISOString(), row.id]);
  return csvExportResponse("shoponline-users", [header, ...body]);
}
