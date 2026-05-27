import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, positiveMoneyValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createDebt, updateDebt } from "@/server/services/debt-service";

function nullableDate(value: unknown) {
  const raw = String(value || "").trim();
  return raw ? new Date(`${raw}T00:00:00.000Z`) : null;
}

const debtFormSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    type: z.enum(["CUSTOMER", "SUPPLIER"]),
    amount: positiveMoneyValue,
    paidAmount: moneyValue,
    dueDate: z.preprocess(nullableDate, z.date().nullable()),
    note: optionalText,
    customerId: optionalText,
    supplierId: optionalText,
  }),
  z.object({
    mode: z.literal("update"),
    id: requiredText,
    amount: positiveMoneyValue,
    paidAmount: moneyValue,
    status: z.enum(["OPEN", "PARTIAL", "PAID", "OVERDUE", "CLOSED"]).optional(),
    dueDate: z.preprocess(nullableDate, z.date().nullable()),
    note: optionalText,
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/debts");
    if (!user) return response;
    const input = parseAdminForm(debtFormSchema, formData);
    await prisma.$transaction((tx) => input.mode === "create" ? createDebt(tx, input, user.id) : updateDebt(tx, input, user.id));
  
    return redirectTo(request, "/admin/finance/debts");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/debts", error);
  }
}
