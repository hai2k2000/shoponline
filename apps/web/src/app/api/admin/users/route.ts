import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { upsertAdminUser } from "@/server/services/admin-system-service";

const schema = z.object({ mode: z.enum(["create", "update"]), id: optionalText, name: requiredText, email: requiredText.transform((v) => v.toLowerCase()), password: optionalText, role: z.enum(["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"]).default("SALES"), status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("ACTIVE") });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user: admin, response } = await requireAdminFormUser(request, formData, "users:write", "/admin/users");
    if (!admin) return response;
  
    const input = parseAdminForm(schema, formData);
    const data = { name: input.name, email: input.email, role: input.role, status: input.status, password: input.password || undefined };
    await prisma.$transaction((tx) => upsertAdminUser(tx, input.mode, data, admin.id, input.id));
  
    return redirectTo(request, "/admin/users");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/users", error);
  }
}
