import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { CheckoutError, createPublicCheckoutOrder } from "../apps/web/src/server/services/checkout-service";

const prisma = new PrismaClient();

function expectCheckoutError(error: unknown, messageIncludes: string, label: string) {
  if (!(error instanceof CheckoutError) || !error.message.includes(messageIncludes)) {
    throw new Error(`${label}: expected CheckoutError including "${messageIncludes}", got ${error instanceof Error ? error.message : String(error)}.`);
  }
}

async function main() {
  const stamp = Date.now().toString().slice(-8);
  const category = await prisma.category.upsert({
    where: { slug: "checkout-smoke" },
    update: { status: "ACTIVE" },
    create: { name: "Checkout Smoke", slug: "checkout-smoke", status: "ACTIVE" },
  });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Checkout Smoke ${stamp}`,
      slug: `checkout-smoke-${stamp}`,
      sku: `CHK-${stamp}`,
      costPrice: 10000,
      salePrice: 50000,
      status: "ACTIVE",
      minStock: 1,
      inventory: { create: { quantity: 3, reservedQuantity: 0 } },
    },
  });
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: { shippingFee: 30000 },
    create: { id: "default", storeName: "ShopOnline", shippingFee: 30000 },
  });
  const promotion = await prisma.promotion.create({
    data: {
      code: `CHK${stamp}`,
      name: `Checkout Smoke ${stamp}`,
      discountType: "FIXED",
      discountValue: 10000,
      minOrder: 0,
      usageLimit: 1,
      status: "ACTIVE",
    },
  });

  const result = await prisma.$transaction((tx) => createPublicCheckoutOrder(tx, {
    items: [{ id: product.id, quantity: 2 }],
    customerName: `Checkout Customer ${stamp}`,
    phone: `09${stamp}`,
    email: null,
    address: "Checkout smoke address",
    note: `checkout smoke ${stamp}`,
    couponCode: promotion.code,
  }));
  const order = await prisma.order.findUniqueOrThrow({ where: { id: result.orderId }, include: { items: true } });
  if (order.orderStatus !== "NEW" || order.paymentStatus !== "UNPAID") throw new Error(`Unexpected order state ${order.orderStatus}/${order.paymentStatus}.`);
  if (Number(order.subtotal) !== 100000 || Number(order.shippingFee) !== 30000 || Number(order.discount) !== 10000 || Number(order.total) !== 120000) {
    throw new Error(`Unexpected checkout totals subtotal=${order.subtotal} shipping=${order.shippingFee} discount=${order.discount} total=${order.total}.`);
  }
  if (order.items.length !== 1 || order.items[0].quantity !== 2) throw new Error("Checkout order items were not created correctly.");
  const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
  if (inventory.quantity !== 3 || inventory.reservedQuantity !== 2) throw new Error(`Unexpected inventory ${inventory.quantity}/${inventory.reservedQuantity}.`);
  const usedPromotion = await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } });
  if (usedPromotion.usedCount !== 1) throw new Error(`Expected promotion usedCount 1, got ${usedPromotion.usedCount}.`);
  const activity = await prisma.activityLog.findFirst({ where: { action: "PUBLIC_CHECKOUT", entityId: order.id } });
  if (!activity) throw new Error("Checkout activity log was not written.");

  try {
    await prisma.$transaction((tx) => createPublicCheckoutOrder(tx, {
      items: [{ id: product.id, quantity: 2 }],
      customerName: `Checkout Customer Low Stock ${stamp}`,
      phone: `08${stamp}`,
      email: null,
      address: null,
      note: null,
      couponCode: null,
    }));
    throw new Error("Expected low-stock checkout to fail.");
  } catch (error) {
    expectCheckoutError(error, "không đủ tồn", "Low-stock checkout");
  }

  try {
    await prisma.$transaction((tx) => createPublicCheckoutOrder(tx, {
      items: [{ id: product.id, quantity: 1 }],
      customerName: `Checkout Customer Used Coupon ${stamp}`,
      phone: `07${stamp}`,
      email: null,
      address: null,
      note: null,
      couponCode: promotion.code,
    }));
    throw new Error("Expected exhausted coupon checkout to fail.");
  } catch (error) {
    expectCheckoutError(error, "hết lượt", "Exhausted coupon checkout");
  }

  console.log("ShopOnline checkout smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
