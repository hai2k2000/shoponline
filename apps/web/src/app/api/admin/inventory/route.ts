import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText, optionalText, positiveIntValue, nonNegativeIntValue } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { mutateInventory } from "@/server/services/inventory-service";

const inventoryFormSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("import"), productId: requiredText, quantity: positiveIntValue, note: optionalText }),
  z.object({ mode: z.literal("export"), productId: requiredText, quantity: positiveIntValue, note: optionalText }),
  z.object({ mode: z.literal("adjust"), productId: requiredText, actualQuantity: nonNegativeIntValue, note: optionalText }),
]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "inventory:write", "/admin/inventory");
  if (!user) return response;
  try {
    const input = parseAdminForm(inventoryFormSchema, formData);
    await prisma.$transaction((tx) => mutateInventory(tx, input, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/inventory", error);
  }

  return redirectTo(request, "/admin/inventory");
}
