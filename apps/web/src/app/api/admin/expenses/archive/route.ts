import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { archiveExpense } from "@/server/services/expense-service";

const archiveSchema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/expenses");
    if (!user) return response;
    const input = parseAdminForm(archiveSchema, formData);
    await prisma.$transaction((tx) => archiveExpense(tx, input.id, user.id));
    return redirectTo(request, "/admin/finance/expenses");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/expenses", error);
  }
}
