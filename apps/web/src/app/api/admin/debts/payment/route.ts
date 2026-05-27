import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, positiveMoneyValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { recordDebtPayment } from "@/server/services/debt-service";

const debtPaymentSchema = z.object({ id: requiredText, payment: positiveMoneyValue });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/debts");
    if (!user) return response;
    const input = parseAdminForm(debtPaymentSchema, formData);
    await prisma.$transaction((tx) => recordDebtPayment(tx, input.id, input.payment, user.id));
    return redirectTo(request, "/admin/finance/debts");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/debts", error);
  }
}
