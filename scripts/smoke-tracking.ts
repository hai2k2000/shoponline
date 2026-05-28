import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { findTrackingOrder } from "../apps/web/src/server/services/tracking-service";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";

async function fetchText(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  if (response.status !== 200) throw new Error(`${path} failed HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  const stamp = Date.now().toString().slice(-8);
  const category = await prisma.category.upsert({
    where: { slug: "tracking-smoke" },
    update: { status: "ACTIVE" },
    create: { name: "Tracking Smoke", slug: "tracking-smoke", status: "ACTIVE" },
  });
  const customer = await prisma.customer.create({ data: { name: `Tracking Customer ${stamp}`, phone: `04${stamp}`, status: "ACTIVE" } });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Tracking Product ${stamp}`,
      slug: `tracking-product-${stamp}`,
      sku: `TRK-${stamp}`,
      costPrice: 10000,
      salePrice: 45000,
      status: "ACTIVE",
      minStock: 1,
      inventory: { create: { quantity: 5, reservedQuantity: 0 } },
    },
  });
  const order = await prisma.order.create({
    data: {
      orderCode: `TRK${stamp}`,
      customerId: customer.id,
      subtotal: 90000,
      shippingFee: 15000,
      discount: 5000,
      total: 100000,
      orderStatus: "SHIPPING",
      paymentStatus: "UNPAID",
      note: `tracking smoke ${stamp}`,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 2,
          costPrice: 10000,
          salePrice: 45000,
          total: 90000,
        },
      },
    },
  });

  const tracked = await findTrackingOrder(prisma, order.orderCode.toLowerCase());
  if (!tracked) throw new Error("Tracking service did not find order with lowercase code.");
  if (tracked.orderCode !== order.orderCode || tracked.customerName !== customer.name || tracked.total !== 100000 || tracked.items.length !== 1) {
    throw new Error("Tracking service returned unexpected order payload.");
  }
  const missing = await findTrackingOrder(prisma, `MISSING${stamp}`);
  if (missing) throw new Error("Tracking service should return null for missing order.");

  const foundHtml = await fetchText(`/tracking?code=${order.orderCode.toLowerCase()}`);
  if (!foundHtml.includes(order.orderCode) || !foundHtml.includes(product.name) || !foundHtml.includes("100.000")) {
    throw new Error("Tracking page did not render the smoke order.");
  }
  const missingHtml = await fetchText(`/tracking?code=MISSING${stamp}`);
  if (!missingHtml.includes("Không tìm thấy đơn hàng")) throw new Error("Tracking page did not render missing-order state.");

  console.log("ShopOnline tracking smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
