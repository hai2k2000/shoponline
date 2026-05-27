import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type ShipmentStatus = "PENDING" | "PACKED" | "SHIPPED" | "DELIVERED" | "FAILED" | "RETURNED";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function back(request: NextRequest) {
  return NextResponse.redirect(new URL("/admin/shipments", request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login?next=/admin/shipments", request.url), { status: 303 });
  const formData = await request.formData();
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
