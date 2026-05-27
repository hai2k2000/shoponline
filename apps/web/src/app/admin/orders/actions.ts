"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type OrderStatus = "NEW" | "CONFIRMED" | "PACKING" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "RETURNED";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

function orderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `SO${date}${now.getTime().toString().slice(-6)}`;
}

export async function createOrderAction(formData: FormData) {
  const user = await requireUser();
  const productId = text(formData, "productId");
  const quantity = Math.max(1, Math.floor(numberValue(formData, "quantity")));
  const customerId = text(formData, "customerId") || null;
  const shippingFee = numberValue(formData, "shippingFee");
  const discount = numberValue(formData, "discount");
  const note = text(formData, "note") || null;
  if (!productId || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, include: { inventory: true } });
    if (!product || product.status === "ARCHIVED") throw new Error("Sản phẩm không hợp lệ.");
    const inventory = product.inventory || await tx.inventory.create({ data: { productId, quantity: 0, reservedQuantity: 0 } });
    const available = inventory.quantity - inventory.reservedQuantity;
    if (quantity > available) throw new Error("Không đủ tồn khả dụng để tạo đơn.");

    const salePrice = Number(product.salePrice);
    const costPrice = Number(product.costPrice);
    const subtotal = salePrice * quantity;
    const total = Math.max(0, subtotal + shippingFee - discount);
    const order = await tx.order.create({
      data: {
        orderCode: orderCode(),
        customerId,
        subtotal,
        shippingFee,
        discount,
        total,
        paymentStatus: total > 0 ? "UNPAID" : "PAID",
        orderStatus: "NEW",
        note,
        items: {
          create: [{
            productId,
            productName: product.name,
            sku: product.sku,
            quantity,
            costPrice,
            salePrice,
            total: subtotal,
          }],
        },
      },
    });

    await tx.inventory.update({
      where: { productId },
      data: { reservedQuantity: inventory.reservedQuantity + quantity },
    });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_ORDER", entityType: "Order", entityId: order.id, description: `Tạo đơn hàng ${order.orderCode}` } });
  });

  revalidateOrders();
}

export async function updateOrderStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const nextStatus = text(formData, "status") as OrderStatus;
  if (!id || !["NEW", "CONFIRMED", "PACKING", "SHIPPING", "COMPLETED", "CANCELLED", "RETURNED"].includes(nextStatus)) return;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (order.orderStatus === nextStatus) return;
    if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new Error("Đơn hàng đã kết thúc, không thể đổi trạng thái.");

    if (nextStatus === "CANCELLED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (!inventory) continue;
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity) },
        });
      }
    }

    if (nextStatus === "COMPLETED" && order.orderStatus !== "COMPLETED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (!inventory || inventory.quantity < item.quantity) throw new Error("Không đủ tồn để hoàn tất đơn.");
        const afterQuantity = inventory.quantity - item.quantity;
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: afterQuantity, reservedQuantity: Math.max(0, inventory.reservedQuantity - item.quantity) },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, type: "EXPORT", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Xuất kho đơn ${order.orderCode}` },
        });
      }
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalOrders: { increment: 1 }, totalSpent: { increment: order.total } },
        });
      }
    }

    if (nextStatus === "RETURNED" && order.orderStatus === "COMPLETED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.upsert({ where: { productId: item.productId }, update: {}, create: { productId: item.productId, quantity: 0, reservedQuantity: 0 } });
        const afterQuantity = inventory.quantity + item.quantity;
        await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, type: "RETURN", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Hoàn kho đơn ${order.orderCode}` },
        });
      }
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalOrders: { decrement: 1 }, totalSpent: { decrement: order.total } },
        });
      }
    }

    await tx.order.update({ where: { id }, data: { orderStatus: nextStatus } });
    await tx.activityLog.create({ data: { userId: user.id, action: "UPDATE_ORDER_STATUS", entityType: "Order", entityId: order.id, description: `Đổi trạng thái ${order.orderCode} sang ${nextStatus}` } });
  });

  revalidateOrders();
}

function revalidateOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
}
