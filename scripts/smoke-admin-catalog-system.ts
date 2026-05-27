import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const secret = process.env.AUTH_SECRET || "change-this-before-production";

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

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const sessionToken = tokenFor(admin);
  const stamp = Date.now().toString().slice(-8);

  const categorySlug = `smoke-cat-${stamp}`;
  await post("/api/admin/categories", { sessionToken, mode: "create", name: `Smoke Cat ${stamp}`, slug: categorySlug, parentId: null, description: "catalog system smoke", sortOrder: 0, status: "ACTIVE" });
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });

  const sku = `CAT-SMOKE-${stamp}`;
  await post("/api/admin/products", { sessionToken, mode: "create", name: `Smoke Product ${stamp}`, slug: `smoke-product-${stamp}`, sku, categoryId: category.id, costPrice: 10000, salePrice: 20000, promotionPrice: null, stockQuantity: 5, minStock: 1, status: "ACTIVE", shortDescription: "smoke", thumbnail: null, description: "catalog system smoke" });
  const product = await prisma.product.findUniqueOrThrow({ where: { sku } });

  const promoCode = `SMOKE${stamp}`;
  await post("/api/admin/promotions", { sessionToken, code: promoCode, name: `Smoke Promo ${stamp}`, discountType: "FIXED", discountValue: 1000, minOrder: 0, maxDiscount: null, usageLimit: 5, endsAt: null });
  const promotion = await prisma.promotion.findUniqueOrThrow({ where: { code: promoCode } });
  await post("/api/admin/promotions/toggle", { sessionToken, id: promotion.id });
  const toggledPromotion = await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } });
  if (toggledPromotion.status !== "HIDDEN") throw new Error(`Expected HIDDEN promotion, got ${toggledPromotion.status}.`);

  await post("/api/admin/settings", { sessionToken, storeName: "ShopOnline", logo: null, phone: null, email: "admin@shoponline.local", address: "Smoke address", shippingFee: 30000, inventoryStrategy: "PREVENT_NEGATIVE" });

  const customer = await prisma.customer.create({ data: { name: `Smoke Timeline ${stamp}`, phone: `08${stamp}`, status: "ACTIVE" } });
  await post("/api/admin/customers/timeline", { sessionToken, customerId: customer.id, type: "NOTE", title: `Smoke timeline ${stamp}`, note: "catalog system smoke" });
  const timeline = await prisma.customerTimeline.findFirst({ where: { customerId: customer.id, title: `Smoke timeline ${stamp}` } });
  if (!timeline) throw new Error("Timeline note was not created.");

  const notification = await prisma.notification.create({ data: { userId: admin.id, level: "INFO", title: `Smoke notification ${stamp}` } });
  await post("/api/admin/notifications/read", { sessionToken, id: notification.id });
  const readNotification = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
  if (!readNotification.readAt) throw new Error("Notification was not marked read.");

  await post("/api/admin/orders", { sessionToken, productId: product.id, quantity: 1, customerId: customer.id, shippingFee: 0, discount: 0, note: `shipment smoke ${stamp}` });
  const order = await prisma.order.findFirstOrThrow({ where: { note: `shipment smoke ${stamp}` }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/shipments", { sessionToken, orderId: order.id, carrier: "Smoke Carrier", service: "Standard", trackingCode: `TRK${stamp}`, shippingFee: 0, status: "PENDING", shippedAt: null, deliveredAt: null, note: "catalog system smoke" });
  const shipment = await prisma.shipment.findFirstOrThrow({ where: { trackingCode: `TRK${stamp}` }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/shipments/status", { sessionToken, id: shipment.id, status: "SHIPPED" });
  const shipped = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
  if (shipped.status !== "SHIPPED") throw new Error(`Expected SHIPPED shipment, got ${shipped.status}.`);

  await post("/api/admin/products/archive", { sessionToken, id: product.id });
  await post("/api/admin/categories/archive", { sessionToken, id: category.id });
  console.log("ShopOnline admin catalog/system smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
