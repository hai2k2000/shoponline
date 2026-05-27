import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, positiveIntValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createAdminOrder } from "@/server/services/order-service";

const orderFormSchema = z.object({
  productId: requiredText,
  quantity: positiveIntValue,
  customerId: optionalText,
  shippingFee: moneyValue,
  discount: moneyValue,
  note: optionalText,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "orders:write", "/admin/orders");
  if (!user) return response;
  try {
    const input = parseAdminForm(orderFormSchema, formData);
    await prisma.$transaction((tx) => createAdminOrder(tx, input, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/orders", error);
  }
  return redirectTo(request, "/admin/orders");
}
