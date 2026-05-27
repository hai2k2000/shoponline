import type { Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type CreatePurchaseInput = {
  productId: string;
  quantity: number;
  supplierId: string | null;
  costPrice: number;
  shippingFee: number;
  expectedAt: Date | null;
  note: string | null;
};

export function purchaseCode() {
  const now = new Date();
  return `PO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

export async function createPurchaseOrder(tx: Prisma.TransactionClient, input: CreatePurchaseInput, userId: string) {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product || product.status === "ARCHIVED") throw new AdminFormError("BUSINESS_RULE_ERROR", "Sản phẩm không hợp lệ.");

  const costPrice = input.costPrice || Number(product.costPrice);
  const subtotal = costPrice * input.quantity;
  const purchase = await tx.purchaseOrder.create({
    data: {
      code: purchaseCode(),
      supplierId: input.supplierId,
      status: "ORDERED",
      subtotal,
      shippingFee: input.shippingFee,
      total: subtotal + input.shippingFee,
      expectedAt: input.expectedAt,
      note: input.note,
      items: { create: [{ productId: input.productId, productName: product.name, sku: product.sku, quantity: input.quantity, costPrice, total: subtotal }] },
    },
  });
  await tx.activityLog.create({ data: { userId, action: "CREATE_PURCHASE_ORDER", entityType: "PurchaseOrder", entityId: purchase.id, description: `Tạo đơn nhập ${purchase.code}` } });
  return purchase;
}

export async function updatePurchaseOrderStatus(tx: Prisma.TransactionClient, id: string, status: "RECEIVED" | "CANCELLED", userId: string) {
  const purchase = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!purchase) throw new AdminFormError("NOT_FOUND", "Không tìm thấy đơn nhập.");
  if (["RECEIVED", "CANCELLED"].includes(purchase.status)) return purchase;

  if (status === "RECEIVED") {
    for (const item of purchase.items) {
      const inventory = await tx.inventory.upsert({
        where: { productId: item.productId },
        update: {},
        create: { productId: item.productId, quantity: 0, reservedQuantity: 0 },
      });
      const beforeQuantity = inventory.quantity;
      const afterQuantity = beforeQuantity + item.quantity;
      await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
      await tx.inventoryTransaction.create({ data: { productId: item.productId, type: "IMPORT", quantity: item.quantity, beforeQuantity, afterQuantity, note: `Nhập kho ${purchase.code}` } });
    }
    await tx.purchaseOrder.update({ where: { id }, data: { status: "RECEIVED", receivedAt: new Date() } });
    await tx.notification.create({
      data: {
        userId,
        level: "SUCCESS",
        title: `Đã nhận hàng ${purchase.code}`,
        message: `Đã nhập ${purchase.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm vào kho.`,
        entityType: "PurchaseOrder",
        entityId: purchase.id,
      },
    });
  } else {
    await tx.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  await tx.activityLog.create({ data: { userId, action: "UPDATE_PURCHASE_ORDER_STATUS", entityType: "PurchaseOrder", entityId: id, description: `Đổi trạng thái đơn nhập ${purchase.code} sang ${status}` } });
  return purchase;
}
