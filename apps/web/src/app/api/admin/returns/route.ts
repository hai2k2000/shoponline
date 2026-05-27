import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createReturnRequest } from "@/server/services/return-service";

const returnFormSchema = z.object({
  orderId: requiredText,
  refundAmount: moneyValue,
  reason: z.preprocess((value) => String(value || "").trim() || "Khác", z.string()),
  note: optionalText,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "returns:write", "/admin/returns");
  if (!user) return response;
  try {
    const input = parseAdminForm(returnFormSchema, formData);
    await prisma.$transaction((tx) => createReturnRequest(tx, input, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/returns", error);
  }

  return redirectTo(request, "/admin/returns");
}
