import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseAdminForm, requiredText } from "@/lib/admin-form";
import { prisma } from "@/lib/prisma";
import { publicUrl, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";
import { updatePurchaseOrderStatus } from "@/server/services/purchase-service";

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/purchases"), { status: 303 });
}

const purchaseStatusSchema = z.object({
  id: requiredText,
  status: z.enum(["RECEIVED", "CANCELLED"]),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { user, response } = await requireAdminFormUser(request, formData, "purchases:write", "/admin/purchases");
  if (!user) return response;
  try {
    const input = parseAdminForm(purchaseStatusSchema, formData);
    await prisma.$transaction((tx) => updatePurchaseOrderStatus(tx, input.id, input.status, user.id));
  } catch (error) {
    return redirectWithAdminError(request, "/admin/purchases", error);
  }

  return back(request);
}
