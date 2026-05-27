import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, nonNegativeIntValue, optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { upsertProduct } from "@/server/services/catalog-service";

const productSchema = z.object({ mode: z.enum(["create", "update"]), id: optionalText, name: requiredText, slug: optionalText, sku: optionalText, categoryId: optionalText, shortDescription: optionalText, description: optionalText, costPrice: moneyValue, salePrice: moneyValue, promotionPrice: z.preprocess((v) => String(v || "").trim() ? Number(v) : null, z.number().min(0).nullable()), thumbnail: optionalText, status: z.enum(["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"]).default("DRAFT"), minStock: nonNegativeIntValue, stockQuantity: nonNegativeIntValue });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "products:write", "/admin/products");
    if (!user) return response;
    const input = parseAdminForm(productSchema, formData);
    await prisma.$transaction((tx) => upsertProduct(tx, input.mode, input, user.id, input.id));
  
    return redirectTo(request, "/admin/products");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/products", error);
  }
}
