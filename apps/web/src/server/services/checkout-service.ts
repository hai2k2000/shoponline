import type { Prisma } from "@prisma/client";

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export type CheckoutCartItem = {
  id: string;
  quantity: number;
};

export type PublicCheckoutInput = {
  items: CheckoutCartItem[];
  customerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  note: string | null;
  couponCode: string | null;
};

function orderCode() {
  const now = new Date();
  return `SO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

function calcDiscount(promotion: { discountType: string; discountValue: unknown; minOrder: unknown; maxDiscount: unknown }, subtotal: number) {
  if (subtotal < Number(promotion.minOrder || 0)) return 0;
  const raw = promotion.discountType === "PERCENT" ? subtotal * Number(promotion.discountValue || 0) / 100 : Number(promotion.discountValue || 0);
  const maxDiscount = promotion.maxDiscount == null ? raw : Math.min(raw, Number(promotion.maxDiscount || 0));
  return Math.max(0, Math.min(subtotal, Math.floor(maxDiscount)));
}

export async function createPublicCheckoutOrder(tx: Prisma.TransactionClient, input: PublicCheckoutInput) {
  const validItems = input.items.filter((item) => item.id && item.quantity > 0);
  if (!validItems.length) throw new CheckoutError("Giỏ hàng trống.");
  if (!input.customerName || !input.phone) throw new CheckoutError("Thiếu tên hoặc số điện thoại.");

  const customer = await tx.customer.create({
    data: {
      name: input.customerName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      source: "Website",
      notes: input.note,
    },
  });

  let subtotal = 0;
  const orderItems = [];
  for (const item of validItems) {
    const product = await tx.product.findUnique({ where: { id: item.id }, include: { inventory: true } });
    if (!product || product.status !== "ACTIVE") throw new CheckoutError("Sản phẩm không hợp lệ.");
    const inventory = product.inventory || await tx.inventory.create({ data: { productId: product.id, quantity: 0, reservedQuantity: 0 } });
    const available = inventory.quantity - inventory.reservedQuantity;
    if (item.quantity > available) throw new CheckoutError(`Sản phẩm ${product.name} không đủ tồn.`);
    const price = Number(product.promotionPrice || product.salePrice);
    subtotal += price * item.quantity;
    orderItems.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      costPrice: product.costPrice,
      salePrice: price,
      total: price * item.quantity,
    });
    await tx.inventory.update({ where: { productId: product.id }, data: { reservedQuantity: inventory.reservedQuantity + item.quantity } });
  }

  const setting = await tx.storeSetting.findUnique({ where: { id: "default" } });
  const shippingFee = Number(setting?.shippingFee || 0);
  const couponCode = input.couponCode?.toUpperCase() || "";
  let discount = 0;
  if (couponCode) {
    const now = new Date();
    const promotion = await tx.promotion.findUnique({ where: { code: couponCode } });
    if (!promotion || promotion.status !== "ACTIVE") throw new CheckoutError("Mã giảm giá không hợp lệ.");
    if (promotion.startsAt && promotion.startsAt > now) throw new CheckoutError("Mã giảm giá chưa bắt đầu.");
    if (promotion.endsAt && promotion.endsAt < now) throw new CheckoutError("Mã giảm giá đã hết hạn.");
    if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) throw new CheckoutError("Mã giảm giá đã hết lượt sử dụng.");
    discount = calcDiscount(promotion, subtotal);
    if (discount <= 0) throw new CheckoutError("Đơn hàng chưa đủ điều kiện áp dụng mã giảm giá.");
    await tx.promotion.update({ where: { id: promotion.id }, data: { usedCount: { increment: 1 } } });
  }

  const order = await tx.order.create({
    data: {
      orderCode: orderCode(),
      customerId: customer.id,
      subtotal,
      shippingFee,
      discount,
      total: Math.max(0, subtotal + shippingFee - discount),
      orderStatus: "NEW",
      paymentStatus: "UNPAID",
      note: input.note,
      items: { create: orderItems },
    },
  });
  await tx.activityLog.create({ data: { action: "PUBLIC_CHECKOUT", entityType: "Order", entityId: order.id, description: `Khách đặt đơn ${order.orderCode}` } });
  return { orderCode: order.orderCode, orderId: order.id };
}
