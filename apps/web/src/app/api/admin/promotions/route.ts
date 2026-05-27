import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createPromotion } from "@/server/services/promotion-service";

const promotionSchema = z.object({
  code: requiredText.transform((value) => value.toUpperCase()),
  name: requiredText,
  discountType: z.enum(["PERCENT", "FIXED"]).default("FIXED"),
  discountValue: moneyValue,
  minOrder: moneyValue,
  maxDiscount: z.preprocess((value) => Number(value || 0) > 0 ? Number(value) : null, z.number().min(0).nullable()),
  usageLimit: z.preprocess((value) => Number(value || 0) > 0 ? Math.floor(Number(value)) : null, z.number().int().positive().nullable()),
  endsAt: z.preprocess((value) => { const raw = String(value || "").trim(); return raw ? new Date(raw) : null; }, z.date().nullable()),
  description: optionalText.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "promotions:write", "/admin/promotions");
    if (!user) return response;
    const input = parseAdminForm(promotionSchema, formData);
    await prisma.$transaction((tx) => createPromotion(tx, input));
    return redirectTo(request, "/admin/promotions");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/promotions", error);
  }
}
