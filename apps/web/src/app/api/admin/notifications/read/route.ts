import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { markNotificationRead } from "@/server/services/admin-system-service";

const schema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user } = await requireAdminFormUser(request, formData, "notifications:write", "/admin/notifications");
    if (!user) return redirectTo(request, "/admin/notifications");
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => markNotificationRead(tx, input.id));
    return redirectTo(request, "/admin/notifications");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/notifications", error);
  }
}
