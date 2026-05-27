"use server";

import { prisma } from "@/lib/prisma";

type CartItem = { id: string; quantity: number };

function orderCode() {
  const now = new Date();
  return `SO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function checkoutAction(formData: FormData) {
  const rawCart = text(formData, "cart");
  const items = JSON.parse(rawCart || "[]") as CartItem[];
  const validItems = items.filter((item) => item.id && item.quantity > 0);
  if (!validItems.length) return { ok: false, error: "Giỏ hàng trống." };
  const customerName = text(formData, "name");
  const phone = text(formData, "phone");
  if (!customerName || !phone) return { ok: false, error: "Thiếu tên hoặc số điện thoại." };

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({ data: { name: customerName, phone, email: text(formData, "email") || null, address: text(formData, "address") || null, source: "Website", notes: text(formData, "note") || null } });
    let subtotal = 0;
    const orderItems = [];
    for (const item of validItems) {
      const product = await tx.product.findUnique({ where: { id: item.id }, include: { inventory: true } });
      if (!product || product.status !== "ACTIVE") throw new Error("Sản phẩm không hợp lệ.");
      const inventory = product.inventory || await tx.inventory.create({ data: { productId: product.id, quantity: 0, reservedQuantity: 0 } });
      const available = inventory.quantity - inventory.reservedQuantity;
      if (item.quantity > available) throw new Error(`Sản phẩm ${product.name} không đủ tồn.`);
      const price = Number(product.promotionPrice || product.salePrice);
      subtotal += price * item.quantity;
      orderItems.push({ productId: product.id, productName: product.name, sku: product.sku, quantity: item.quantity, costPrice: product.costPrice, salePrice: price, total: price * item.quantity });
      await tx.inventory.update({ where: { productId: product.id }, data: { reservedQuantity: inventory.reservedQuantity + item.quantity } });
    }
    const setting = await tx.storeSetting.findUnique({ where: { id: "default" } });
    const shippingFee = Number(setting?.shippingFee || 0);
    const order = await tx.order.create({ data: { orderCode: orderCode(), customerId: customer.id, subtotal, shippingFee, discount: 0, total: subtotal + shippingFee, orderStatus: "NEW", paymentStatus: "UNPAID", note: text(formData, "note") || null, items: { create: orderItems } } });
    await tx.activityLog.create({ data: { action: "PUBLIC_CHECKOUT", entityType: "Order", entityId: order.id, description: `Khách đặt đơn ${order.orderCode}` } });
    return { orderCode: order.orderCode };
  });
  return { ok: true, orderCode: result.orderCode };
}
