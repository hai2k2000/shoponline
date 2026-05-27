import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { closeDebt } from "@/server/services/debt-service";

const closeDebtSchema = z.object({ id: requiredText });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "finance:write", "/admin/finance/debts");
    if (!user) return response;
    const input = parseAdminForm(closeDebtSchema, formData);
    await prisma.$transaction((tx) => closeDebt(tx, input.id, user.id));
    return redirectTo(request, "/admin/finance/debts");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/finance/debts", error);
  }
}
