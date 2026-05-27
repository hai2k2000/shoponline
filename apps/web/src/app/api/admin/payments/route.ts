import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, positiveMoneyValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { recordPayment } from "@/server/services/payment-service";

const paymentFormSchema = z.object({
  orderId: requiredText,
  amount: positiveMoneyValue,
  method: z.preprocess((value) => String(value || "CASH").trim() || "CASH", z.string()),
  reference: optionalText,
  note: optionalText,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/payments");
  if (!user) return response;
  try {
    const input = parseAdminForm(paymentFormSchema, formData);
    await prisma.$transaction((tx) => recordPayment(tx, input, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/payments", error);
  }

  return redirectTo(request, "/admin/finance/payments");
}
