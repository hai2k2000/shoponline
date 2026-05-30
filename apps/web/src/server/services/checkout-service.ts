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
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SO${now.toISOString().slice(0, 10).replaceAll("-", "")}${rand}`;
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

  // Upsert customer theo phone để tránh duplicate
  const phone = input.phone.trim();
  const existing = await tx.customer.findFirst({ where: { phone } });
  const customer = existing
    ? await tx.customer.update({
        where: { id: existing.id },
        data: {
          name: input.customerName,
          email: input.email ?? existing.email,
          address: input.address ?? existing.address,
        },
      })
    : await tx.customer.create({
        data: {
          name: input.customerName,
          phone,
          email: input.email,
          address: input.address,
          source: "Website",
          notes: input.note,
        },
      });

  let subtotal = 0;
  const orderItems = [];
  for (const item of validItems) {
    const product = await tx.product.findUnique({ where: { id: item.id } });
    if (!product || product.status !== "ACTIVE") throw new CheckoutError("Sản phẩm không hợp lệ.");

    // Atomic reserve: chỉ tăng reservedQuantity nếu available >= quantity
    const reserved = await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}
      WHERE "productId" = ${item.id}
        AND (quantity - "reservedQuantity") >= ${item.quantity}
    `;
    if (reserved === 0) throw new CheckoutError(`Sản phẩm ${product.name} không đủ tồn.`);

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
