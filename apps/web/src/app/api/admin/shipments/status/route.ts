import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { updateShipmentStatus } from "@/server/services/shipment-service";

const schema = z.object({ id: requiredText, status: z.enum(["PENDING", "PACKED", "SHIPPED", "DELIVERED", "FAILED", "RETURNED"]) });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user, response } = await requireAdminFormUser(request, formData, "shipments:write", "/admin/shipments");
    if (!user) return response;
    const input = parseAdminForm(schema, formData);
    await prisma.$transaction((tx) => updateShipmentStatus(tx, input.id, input.status, user.id));

    return redirectTo(request, "/admin/shipments");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/shipments", error);
  }
}
