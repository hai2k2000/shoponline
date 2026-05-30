import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { findTrackingOrder } from "../apps/web/src/server/services/tracking-service";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const secret = process.env.AUTH_SECRET || "change-this-before-production";
const sessionCookie = "shoponline.session";
let authCookie = "";

function tokenFor(user: { id: string; email: string; role: string }) {
  const body = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Date.now() + 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

async function fetchText(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { headers: authCookie ? { cookie: authCookie } : undefined });
  const text = await response.text();
  if (response.status !== 200) throw new Error(`${path} failed HTTP ${response.status}: ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing active admin user.");
  authCookie = `${sessionCookie}=${tokenFor(admin)}`;

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
      paymentStatus: "PARTIAL",
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
  await prisma.paymentTransaction.create({
    data: { orderId: order.id, amount: 40000, method: "BANK_TRANSFER", reference: `TRK-PAY-${stamp}`, note: `tracking smoke payment ${stamp}` },
  });
  await prisma.shipment.create({
    data: { orderId: order.id, carrier: "Tracking Carrier", service: "Standard", trackingCode: `TRKSHIP${stamp}`, shippingFee: 15000, status: "SHIPPED", shippedAt: new Date(), note: `tracking smoke shipment ${stamp}` },
  });

  const tracked = await findTrackingOrder(prisma, order.orderCode.toLowerCase());
  if (!tracked) throw new Error("Tracking service did not find order with lowercase code.");
  if (tracked.orderCode !== order.orderCode || tracked.customerName !== customer.name || tracked.total !== 100000 || tracked.paid !== 40000 || tracked.remaining !== 60000 || tracked.items.length !== 1) {
    throw new Error("Tracking service returned unexpected order payload.");
  }
  if (!tracked.latestShipment || tracked.latestShipment.trackingCode !== `TRKSHIP${stamp}` || tracked.latestShipment.status !== "SHIPPED") {
    throw new Error("Tracking service did not return latest shipment summary.");
  }

  const missing = await findTrackingOrder(prisma, `MISSING${stamp}`);
  if (missing) throw new Error("Tracking service should return null for missing order.");

  const foundHtml = await fetchText(`/tracking?code=${order.orderCode.toLowerCase()}`);
  if (!foundHtml.includes(order.orderCode) || !foundHtml.includes(product.name) || !foundHtml.includes("100.000")) {
    throw new Error("Tracking page did not render the smoke order.");
  }
  if (!foundHtml.includes("Da thanh toan") || !foundHtml.includes("Con phai thu") || !foundHtml.includes(`TRKSHIP${stamp}`)) {
    throw new Error("Tracking page did not render payment/shipment reconciliation.");
  }

  const missingHtml = await fetchText(`/tracking?code=MISSING${stamp}`);
  if (!missingHtml.includes("Khong tim thay don hang")) throw new Error("Tracking page did not render missing-order state.");

  console.log("ShopOnline tracking smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
