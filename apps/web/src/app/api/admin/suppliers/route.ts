import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createSupplier, updateSupplier } from "@/server/services/supplier-service";

const supplierFormSchema = z.object({
  mode: z.enum(["create", "update"]),
  id: optionalText,
  name: requiredText,
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  taxCode: optionalText,
  note: optionalText,
  status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("ACTIVE"),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "suppliers:write", "/admin/suppliers");
    if (!user) return response;
    const input = parseAdminForm(supplierFormSchema, formData);
    const data = { name: input.name, phone: input.phone, email: input.email, address: input.address, taxCode: input.taxCode, note: input.note, status: input.status };
    await prisma.$transaction(async (tx) => {
      if (input.mode === "create") await createSupplier(tx, data, user.id);
      if (input.mode === "update" && input.id) await updateSupplier(tx, input.id, data, user.id);
    });
  
    return redirectTo(request, "/admin/suppliers");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/suppliers", error);
  }
}
