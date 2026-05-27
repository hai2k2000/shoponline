import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { updateStoreSetting } from "@/server/services/admin-system-service";

const schema = z.object({ storeName: z.preprocess((v) => String(v || "").trim() || "ShopOnline", z.string()), logo: optionalText, phone: optionalText, email: optionalText, address: optionalText, shippingFee: moneyValue, inventoryStrategy: z.preprocess((v) => String(v || "").trim() || "PREVENT_NEGATIVE", z.string()) });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "settings:write", "/admin/settings");
    if (!user) return response;
  
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => updateStoreSetting(tx, input, user.id));
    return redirectTo(request, "/admin/settings");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/settings", error);
  }
}
