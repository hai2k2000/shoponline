import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { transitionReturnStatus } from "@/server/services/return-service";

type ReturnStatus = "APPROVED" | "RECEIVED" | "REFUNDED" | "REJECTED";
const returnStatusSchema = z.object({
  id: requiredText,
  status: z.enum(["APPROVED", "RECEIVED", "REFUNDED", "REJECTED"]),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "returns:write", "/admin/returns");
  if (!user) return response;
  try {
    const input = parseAdminForm(returnStatusSchema, formData);
    await prisma.$transaction((tx) => transitionReturnStatus(tx, input.id, input.status as ReturnStatus, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/returns", error);
  }

  return redirectTo(request, "/admin/returns");
}
