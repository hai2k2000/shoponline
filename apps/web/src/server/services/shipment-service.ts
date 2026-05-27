import type { Prisma, ShipmentStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type ShipmentInput = {
  orderId: string;
  carrier: string;
  service: string | null;
  trackingCode: string | null;
  shippingFee: number;
  status: ShipmentStatus;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  note: string | null;
};

export async function createShipment(tx: Prisma.TransactionClient, input: ShipmentInput, userId: string) {
  const order = await tx.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new AdminFormError("NOT_FOUND", "Không tìm thấy đơn hàng.");
  if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new AdminFormError("BUSINESS_RULE_ERROR", "Không thể tạo vận đơn cho đơn đã hủy hoặc trả hàng.");
  const shipment = await tx.shipment.create({ data: { ...input, createdById: userId } });
  if (shipment.status === "SHIPPED" && !["COMPLETED", "CANCELLED", "RETURNED"].includes(order.orderStatus)) {
    await tx.order.update({ where: { id: input.orderId }, data: { orderStatus: "SHIPPING" } });
  }
  await tx.activityLog.create({ data: { userId, action: "CREATE_SHIPMENT", entityType: "Shipment", entityId: shipment.id, description: `Tạo vận đơn cho ${order.orderCode}` } });
  return shipment;
}

export async function updateShipmentStatus(tx: Prisma.TransactionClient, id: string, status: ShipmentStatus, userId: string) {
  const shipment = await tx.shipment.findUnique({ where: { id }, include: { order: true } });
  if (!shipment) throw new AdminFormError("NOT_FOUND", "Không tìm thấy vận đơn.");
  const updated = await tx.shipment.update({
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
  await tx.activityLog.create({ data: { userId, action: "UPDATE_SHIPMENT_STATUS", entityType: "Shipment", entityId: id, description: `Đổi trạng thái vận đơn ${shipment.order.orderCode} sang ${status}` } });
  return updated;
}
