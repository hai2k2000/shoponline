import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { archiveProduct } from "@/server/services/catalog-service";

const schema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "products:write", "/admin/products");
    if (!user) return response;
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => archiveProduct(tx, input.id, user.id));
    return redirectTo(request, "/admin/products");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/products", error);
  }
}
