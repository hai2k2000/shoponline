import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { archiveCategory } from "@/server/services/catalog-service";

const schema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "categories:write", "/admin/categories");
    if (!user) return response;
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => archiveCategory(tx, input.id, user.id));
    return redirectTo(request, "/admin/categories");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/categories", error);
  }
}
