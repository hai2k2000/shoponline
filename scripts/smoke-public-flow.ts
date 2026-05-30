import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { createPublicCheckoutOrder } from "../apps/web/src/server/services/checkout-service";

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

function assertIncludes(body: string, text: string, label: string) {
  if (!body.includes(text)) throw new Error(`${label}: expected page to include "${text}".`);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing active admin user.");
  authCookie = `${sessionCookie}=${tokenFor(admin)}`;

  const stamp = Date.now().toString().slice(-8);
  const category = await prisma.category.upsert({
    where: { slug: "public-flow-smoke" },
    update: { status: "ACTIVE" },
    create: { name: "Public Flow Smoke", slug: "public-flow-smoke", status: "ACTIVE" },
  });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Public Flow Smoke ${stamp}`,
      slug: `public-flow-smoke-${stamp}`,
      sku: `CHK-PUB-${stamp}`,
      shortDescription: "Smoke product visible on public storefront",
      costPrice: 12000,
      salePrice: 64000,
      promotionPrice: 59000,
      status: "ACTIVE",
      minStock: 1,
      inventory: { create: { quantity: 6, reservedQuantity: 0 } },
    },
  });
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: { storeName: "ShopOnline", shippingFee: 25000 },
    create: { id: "default", storeName: "ShopOnline", shippingFee: 25000 },
  });

  const productsHtml = await fetchText("/products");
  assertIncludes(productsHtml, product.name, "Products page");
  assertIncludes(productsHtml, product.sku, "Products page");
  assertIncludes(productsHtml, "Xem chi tiết", "Products page");
  assertIncludes(productsHtml, "Thêm vào giỏ", "Products page");

  const productDetailHtml = await fetchText(`/products/${product.slug}`);
  assertIncludes(productDetailHtml, product.name, "Product detail page");
  assertIncludes(productDetailHtml, product.sku, "Product detail page");
  assertIncludes(productDetailHtml, "Tồn khả dụng", "Product detail page");
  assertIncludes(productDetailHtml, "Thêm vào giỏ", "Product detail page");

  const orderResult = await prisma.$transaction((tx) => createPublicCheckoutOrder(tx, {
    items: [{ id: product.id, quantity: 2 }],
    customerName: `Public Flow Customer ${stamp}`,
    phone: `05${stamp}`,
    email: `public-flow-${stamp}@shoponline.local`,
    address: "Public flow smoke address",
    note: `public flow smoke ${stamp}`,
    couponCode: null,
  }));

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderResult.orderId }, include: { items: true } });
  if (order.orderStatus !== "NEW" || order.paymentStatus !== "UNPAID") throw new Error(`Unexpected public order state ${order.orderStatus}/${order.paymentStatus}.`);
  if (Number(order.subtotal) !== 118000 || Number(order.shippingFee) !== 25000 || Number(order.total) !== 143000) {
    throw new Error(`Unexpected public checkout totals subtotal=${order.subtotal} shipping=${order.shippingFee} total=${order.total}.`);
  }
  if (order.items.length !== 1 || order.items[0].productName !== product.name || order.items[0].quantity !== 2) throw new Error("Public checkout order items were not created correctly.");

  const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: product.id } });
  if (inventory.quantity !== 6 || inventory.reservedQuantity !== 2) throw new Error(`Unexpected public flow inventory ${inventory.quantity}/${inventory.reservedQuantity}.`);

  const trackingHtml = await fetchText(`/tracking?code=${orderResult.orderCode.toLowerCase()}`);
  assertIncludes(trackingHtml, orderResult.orderCode, "Tracking page");
  assertIncludes(trackingHtml, product.name, "Tracking page");
  assertIncludes(trackingHtml, "Chua thanh toan", "Tracking page");
  assertIncludes(trackingHtml, "Phi giao hang", "Tracking page");
  assertIncludes(trackingHtml, "Con phai thu", "Tracking page");
  assertIncludes(trackingHtml, "143.000", "Tracking page");

  const checkoutHtml = await fetchText("/checkout");
  assertIncludes(checkoutHtml, "Họ tên", "Checkout page");
  assertIncludes(checkoutHtml, "Đặt hàng", "Checkout page");

  const cartHtml = await fetchText("/cart");
  assertIncludes(cartHtml, "Giỏ hàng", "Cart page");
  assertIncludes(cartHtml, "Tiếp tục mua", "Cart page");

  console.log("ShopOnline public flow smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
