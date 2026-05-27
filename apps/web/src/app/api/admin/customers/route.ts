import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createCustomer, updateCustomer } from "@/server/services/customer-service";

const customerFormSchema = z.object({
  mode: z.enum(["create", "update"]),
  id: optionalText,
  name: requiredText,
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  source: optionalText,
  group: optionalText,
  notes: optionalText,
  status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("ACTIVE"),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "customers:write", "/admin/customers");
    if (!user) return response;
    const input = parseAdminForm(customerFormSchema, formData);
    const data = { name: input.name, phone: input.phone, email: input.email, address: input.address, source: input.source, group: input.group, notes: input.notes, status: input.status };
    await prisma.$transaction(async (tx) => {
      if (input.mode === "create") await createCustomer(tx, data, user.id);
      if (input.mode === "update" && input.id) await updateCustomer(tx, input.id, data, user.id);
    });
  
    return redirectTo(request, "/admin/customers");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/customers", error);
  }
}
