import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type ShipmentStatus = "PENDING" | "PACKED" | "SHIPPED" | "DELIVERED" | "FAILED" | "RETURNED";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/shipments"), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/shipments"), { status: 303 });
  const id = text(formData, "id");
  const status = text(formData, "status") as ShipmentStatus;
  if (!id || !["PENDING", "PACKED", "SHIPPED", "DELIVERED", "FAILED", "RETURNED"].includes(status)) return back(request);

  await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({ where: { id }, include: { order: true } });
    if (!shipment) throw new Error("Không tìm thấy vận đơn.");
    await tx.shipment.update({
      where: { id },
      data: {
        status,
        shippedAt: status === "SHIPPED" && !shipment.shippedAt ? new Date() : shipment.shippedAt,
        deliveredAt: status === "DELIVERED" && !shipment.deliveredAt ? new Date() : shipment.deliveredAt,
      },
    });
    if (status === "SHIPPED" && !["COMPLETED", "CANCELLED", "RETURNED"].includes(shipment.order.orderStatus)) {
      await tx.order.update({ where: { id: shipment.orderId }, data: { orderStatus: "SHIPPING" } });
    }
    await tx.activityLog.create({ data: { userId: user.id, action: "UPDATE_SHIPMENT_STATUS", entityType: "Shipment", entityId: id, description: `Đổi trạng thái vận đơn ${shipment.order.orderCode} sang ${status}` } });
  });

  return back(request);
}

function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}
