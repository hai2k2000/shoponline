import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const secret = process.env.AUTH_SECRET || "change-this-before-production";
const sessionCookie = "shoponline.session";

function tokenFor(user: { id: string; email: string; role: string }) {
  const body = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Date.now() + 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

async function post(path: string, values: Record<string, string | number | null>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== null) body.set(key, String(value));
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", body, redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" } });
  if (![303, 307, 308].includes(response.status)) throw new Error(`${path} failed HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

async function fetchText(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { cookie } });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 300)}`);
  return { body, contentType: response.headers.get("content-type") || "" };
}

async function assertPageIncludes(path: string, cookie: string, expected: string) {
  const { body } = await fetchText(path, cookie);
  if (!body.includes(expected)) throw new Error(`${path}: missing expected text "${expected}".`);
}

async function assertCsvIncludes(path: string, cookie: string, expected: string) {
  const { body, contentType } = await fetchText(path, cookie);
  if (!contentType.includes("text/csv")) throw new Error(`${path}: expected text/csv, got "${contentType}".`);
  if (!body.includes(expected)) throw new Error(`${path}: CSV missing expected text "${expected}".`);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing active admin user.");
  const sessionToken = tokenFor(admin);
  const cookie = `${sessionCookie}=${sessionToken}`;
  const stamp = Date.now().toString().slice(-8);

  const categorySlug = `uat-cat-${stamp}`;
  await post("/api/admin/categories", { sessionToken, mode: "create", name: `UAT Category ${stamp}`, slug: categorySlug, parentId: null, description: "business uat smoke", sortOrder: 0, status: "ACTIVE" });
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });

  const sku = `UAT-SKU-${stamp}`;
  await post("/api/admin/products", { sessionToken, mode: "create", name: `UAT Product ${stamp}`, slug: `uat-product-${stamp}`, sku, categoryId: category.id, costPrice: 10000, salePrice: 50000, promotionPrice: null, stockQuantity: 6, minStock: 2, status: "ACTIVE", shortDescription: "business uat smoke", thumbnail: null, description: "business uat smoke" });
  const product = await prisma.product.findUniqueOrThrow({ where: { sku }, include: { inventory: true } });
  if (!product.inventory || product.inventory.quantity !== 6) throw new Error(`Expected product inventory 6, got ${product.inventory?.quantity ?? "missing"}.`);

  const customer = await prisma.customer.create({
    data: { name: `UAT Customer ${stamp}`, phone: `09${stamp}`, email: `uat-${stamp}@shoponline.local`, address: "Business UAT address", source: "UAT", group: "Smoke", status: "ACTIVE", notes: "business uat smoke" },
  });

  const orderNote = `business uat order ${stamp}`;
  await post("/api/admin/orders", { sessionToken, productId: product.id, quantity: 2, customerId: customer.id, shippingFee: 25000, discount: 5000, note: orderNote });
  const order = await prisma.order.findFirstOrThrow({ where: { note: orderNote }, include: { items: true }, orderBy: { createdAt: "desc" } });
  if (order.orderStatus !== "NEW") throw new Error(`Expected NEW order, got ${order.orderStatus}.`);
  if (order.items.length !== 1 || order.items[0].quantity !== 2) throw new Error("Order item quantity was not recorded correctly.");
  const reservedInventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
  if (reservedInventory.reservedQuantity < 2) throw new Error(`Expected at least 2 reserved stock, got ${reservedInventory.reservedQuantity}.`);

  const halfPayment = Math.floor(Number(order.total) / 2);
  await post("/api/admin/payments", { sessionToken, orderId: order.id, amount: halfPayment, method: "BANK_TRANSFER", reference: `UAT-PART-${stamp}`, note: "business uat partial payment" });
  const partialOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (partialOrder.paymentStatus !== "PARTIAL") throw new Error(`Expected PARTIAL payment status, got ${partialOrder.paymentStatus}.`);

  await post("/api/admin/payments", { sessionToken, orderId: order.id, amount: Number(order.total) - halfPayment, method: "CASH", reference: `UAT-FULL-${stamp}`, note: "business uat final payment" });
  const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (paidOrder.paymentStatus !== "PAID") throw new Error(`Expected PAID payment status, got ${paidOrder.paymentStatus}.`);

  const trackingCode = `UATTRK${stamp}`;
  await post("/api/admin/shipments", { sessionToken, orderId: order.id, carrier: "UAT Carrier", service: "Standard", trackingCode, shippingFee: 25000, status: "PENDING", shippedAt: null, deliveredAt: null, note: "business uat shipment" });
  const shipment = await prisma.shipment.findFirstOrThrow({ where: { trackingCode }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/shipments/status", { sessionToken, id: shipment.id, status: "SHIPPED" });
  const shipped = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
  if (shipped.status !== "SHIPPED") throw new Error(`Expected SHIPPED shipment, got ${shipped.status}.`);

  await post("/api/admin/orders/status", { sessionToken, id: order.id, status: "COMPLETED" });
  const completed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (completed.orderStatus !== "COMPLETED") throw new Error(`Expected COMPLETED order, got ${completed.orderStatus}.`);

  await assertPageIncludes(`/admin/orders?search=${encodeURIComponent(order.orderCode)}`, cookie, order.orderCode);
  await assertPageIncludes(`/admin/customers?search=${encodeURIComponent(customer.name)}`, cookie, customer.name);
  await assertPageIncludes(`/admin/products?search=${encodeURIComponent(sku)}`, cookie, sku);
  await assertPageIncludes(`/admin/inventory?search=${encodeURIComponent(sku)}`, cookie, sku);
  await assertPageIncludes(`/admin/finance/payments?search=${encodeURIComponent(order.orderCode)}`, cookie, order.orderCode);
  await assertPageIncludes(`/admin/shipments?search=${encodeURIComponent(order.orderCode)}`, cookie, trackingCode);

  await assertCsvIncludes(`/api/admin/orders/export?search=${encodeURIComponent(order.orderCode)}`, cookie, order.orderCode);
  await assertCsvIncludes(`/api/admin/customers/export?search=${encodeURIComponent(customer.name)}`, cookie, customer.name);
  await assertCsvIncludes(`/api/admin/products/export?search=${encodeURIComponent(sku)}`, cookie, sku);
  await assertCsvIncludes(`/api/admin/inventory/export?search=${encodeURIComponent(sku)}`, cookie, sku);
  await assertCsvIncludes(`/api/admin/finance/payments/export?search=${encodeURIComponent(order.orderCode)}`, cookie, order.orderCode);
  await assertCsvIncludes(`/api/admin/shipments/export?search=${encodeURIComponent(order.orderCode)}`, cookie, trackingCode);

  console.log(`ShopOnline business UAT smoke passed for order ${order.orderCode}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
