import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { transitionOrderStatus } from "@/server/services/order-service";

type OrderStatus = "NEW" | "CONFIRMED" | "PACKING" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "RETURNED";
const orderStatusSchema = z.object({
  id: requiredText,
  status: z.enum(["NEW", "CONFIRMED", "PACKING", "SHIPPING", "COMPLETED", "CANCELLED", "RETURNED"]),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "orders:write", "/admin/orders");
  if (!user) return response;
  try {
    const input = parseAdminForm(orderStatusSchema, formData);
    await prisma.$transaction((tx) => transitionOrderStatus(tx, input.id, input.status as OrderStatus, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/orders", error);
  }

  return redirectTo(request, "/admin/orders");
}
