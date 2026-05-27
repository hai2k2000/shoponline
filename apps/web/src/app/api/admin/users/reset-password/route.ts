import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { resetAdminUserPassword } from "@/server/services/admin-system-service";

const schema = z.object({ id: requiredText, password: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user: admin, response } = await requireAdminFormUser(request, formData, "users:write", "/admin/users");
    if (!admin) return response;
  
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => resetAdminUserPassword(tx, input.id, input.password, admin.id));
    return redirectTo(request, "/admin/users");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/users", error);
  }
}
