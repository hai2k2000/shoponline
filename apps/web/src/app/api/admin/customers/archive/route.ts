import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { archiveCustomer } from "@/server/services/customer-service";

const archiveSchema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "customers:write", "/admin/customers");
    if (!user) return response;
    const input = parseAdminForm(archiveSchema, formData);
    await prisma.$transaction((tx) => archiveCustomer(tx, input.id, user.id));
    return redirectTo(request, "/admin/customers");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/customers", error);
  }
}
