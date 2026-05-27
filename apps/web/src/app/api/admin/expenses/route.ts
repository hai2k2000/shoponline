import type { NextRequest } from "next/server";
import { z } from "zod";
import { optionalText, parseAdminForm, positiveMoneyValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createExpense, updateExpense } from "@/server/services/expense-service";

const expenseFormSchema = z.object({
  mode: z.enum(["create", "update"]),
  id: optionalText,
  title: requiredText,
  amount: positiveMoneyValue,
  category: z.preprocess((value) => String(value || "").trim() || "Khác", z.string()),
  note: optionalText,
  status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("ACTIVE"),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/expenses");
    if (!user) return response;
    const input = parseAdminForm(expenseFormSchema, formData);
    const data = { title: input.title, amount: input.amount, category: input.category, note: input.note, status: input.status };
    await prisma.$transaction(async (tx) => {
      if (input.mode === "create") await createExpense(tx, data, user.id);
      if (input.mode === "update" && input.id) await updateExpense(tx, input.id, data, user.id);
    });
  
    return redirectTo(request, "/admin/finance/expenses");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/expenses", error);
  }
}
