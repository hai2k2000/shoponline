import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redirectTo, requireAdminFormUser } from "@/lib/admin-api";
import { markAllNotificationsRead } from "@/server/services/admin-system-service";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user } = await requireAdminFormUser(request, formData, "notifications:write", "/admin/notifications");
  if (!user) return redirectTo(request, "/admin/notifications");
  await prisma.$transaction((tx) => markAllNotificationsRead(tx));
  return redirectTo(request, "/admin/notifications");
}
