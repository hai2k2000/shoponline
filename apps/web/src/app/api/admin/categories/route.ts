import type { NextRequest } from "next/server";
import { z } from "zod";
import { nonNegativeIntValue, optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { upsertCategory } from "@/server/services/catalog-service";

const categorySchema = z.object({ mode: z.enum(["create", "update"]), id: optionalText, name: requiredText, slug: optionalText, parentId: optionalText, description: optionalText, sortOrder: nonNegativeIntValue, status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("ACTIVE") });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "categories:write", "/admin/categories");
    if (!user) return response;
    const input = parseAdminForm(categorySchema, formData);
    await prisma.$transaction((tx) => upsertCategory(tx, input.mode, input, user.id, input.id));
  
    return redirectTo(request, "/admin/categories");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/categories", error);
  }
}
