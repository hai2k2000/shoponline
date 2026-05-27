import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, positiveIntValue, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { publicUrl, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createPurchaseOrder } from "@/server/services/purchase-service";

function nullableDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(raw) : null;
}

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/purchases"), { status: 303 });
}

const purchaseFormSchema = z.object({
  productId: requiredText,
  quantity: positiveIntValue,
  supplierId: optionalText,
  costPrice: moneyValue,
  shippingFee: moneyValue,
  expectedAt: z.preprocess(nullableDate, z.date().nullable()),
  note: optionalText,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "purchases:write", "/admin/purchases");
  if (!user) return response;
  try {
    const input = parseAdminForm(purchaseFormSchema, formData);
    await prisma.$transaction((tx) => createPurchaseOrder(tx, input, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/purchases", error);
  }

  return back(request);
}
