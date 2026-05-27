import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const sessionCookie = "shoponline.session";
const secret = process.env.AUTH_SECRET || "change-this-before-production";

function base64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(user: { id: string; email: string; role: string }) {
  const body = base64url(JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Date.now() + 60 * 60 * 1000 }));
  return `${body}.${sign(body)}`;
}

async function post(path: string, values: Record<string, string | number | null>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null) body.set(key, String(value));
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body,
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  if (![303, 307, 308].includes(response.status)) {
    const text = await response.text();
    throw new Error(`${path} failed HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing active admin@shoponline.local user.");
  const sessionToken = createSessionToken(admin);

  const category = await prisma.category.upsert({
    where: { slug: "backend-smoke" },
    update: { status: "ACTIVE" },
    create: { name: "Backend Smoke", slug: "backend-smoke", status: "ACTIVE" },
  });
  const stamp = Date.now().toString().slice(-8);
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Backend Smoke ${stamp}`,
      slug: `backend-smoke-${stamp}`,
      sku: `SMOKE-${stamp}`,
      costPrice: 10000,
      salePrice: 20000,
      status: "ACTIVE",
      minStock: 1,
      inventory: { create: { quantity: 20, reservedQuantity: 0 } },
    },
  });

  await post("/api/admin/inventory", { sessionToken, mode: "import", productId: product.id, quantity: 3, note: "admin core smoke import" });
  const afterImport = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
  if (afterImport.quantity !== 23) throw new Error(`Expected inventory quantity 23, got ${afterImport.quantity}.`);

  const orderNote = `admin core smoke order ${stamp}`;
  await post("/api/admin/orders", { sessionToken, productId: product.id, quantity: 1, shippingFee: 0, discount: 0, note: orderNote });
  const order = await prisma.order.findFirstOrThrow({ where: { note: orderNote }, orderBy: { createdAt: "desc" } });
  if (order.orderStatus !== "NEW") throw new Error(`Expected NEW order, got ${order.orderStatus}.`);

  await post("/api/admin/orders/status", { sessionToken, id: order.id, status: "COMPLETED" });
  const completedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (completedOrder.orderStatus !== "COMPLETED") throw new Error(`Expected COMPLETED order, got ${completedOrder.orderStatus}.`);

  await post("/api/admin/payments", { sessionToken, orderId: order.id, amount: Number(order.total), method: "CASH", reference: `SMOKE-${stamp}`, note: "admin core smoke payment" });
  const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (paidOrder.paymentStatus !== "PAID") throw new Error(`Expected PAID order, got ${paidOrder.paymentStatus}.`);

  const purchaseNote = `admin core smoke purchase ${stamp}`;
  await post("/api/admin/purchases", { sessionToken, productId: product.id, quantity: 2, costPrice: 9000, shippingFee: 0, note: purchaseNote });
  const purchase = await prisma.purchaseOrder.findFirstOrThrow({ where: { note: purchaseNote }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/purchases/status", { sessionToken, id: purchase.id, status: "RECEIVED" });
  const receivedPurchase = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.id } });
  if (receivedPurchase.status !== "RECEIVED") throw new Error(`Expected RECEIVED purchase, got ${receivedPurchase.status}.`);

  console.log("ShopOnline admin core smoke passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
