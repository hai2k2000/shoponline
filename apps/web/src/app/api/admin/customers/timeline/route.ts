import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createCustomerTimeline } from "@/server/services/admin-system-service";

const schema = z.object({ customerId: requiredText, type: z.enum(["NOTE", "CALL", "MESSAGE", "ORDER", "SUPPORT"]).default("NOTE"), title: requiredText, note: optionalText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "customers:write", "/admin/customers/timeline");
    if (!user) return response;
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => createCustomerTimeline(tx, input, user.id));
    return redirectTo(request, "/admin/customers/timeline");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/customers/timeline", error);
  }
}
