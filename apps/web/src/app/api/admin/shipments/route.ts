import type { NextRequest } from "next/server";
import { z } from "zod";
import { moneyValue, optionalText, parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { createShipment } from "@/server/services/shipment-service";

const shipmentSchema = z.object({
  orderId: requiredText,
  carrier: requiredText,
  service: optionalText,
  trackingCode: optionalText,
  shippingFee: moneyValue,
  status: z.enum(["PENDING", "PACKED", "SHIPPED", "DELIVERED", "FAILED", "RETURNED"]).default("PENDING"),
  shippedAt: z.preprocess((value) => { const raw = String(value || "").trim(); return raw ? new Date(raw) : null; }, z.date().nullable()),
  deliveredAt: z.preprocess((value) => { const raw = String(value || "").trim(); return raw ? new Date(raw) : null; }, z.date().nullable()),
  note: optionalText,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "shipments:write", "/admin/shipments");
    if (!user) return response;
    const input = parseAdminForm(shipmentSchema, formData);
    await prisma.$transaction((tx) => createShipment(tx, input, user.id));

    return redirectTo(request, "/admin/shipments");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/shipments", error);
  }
}
