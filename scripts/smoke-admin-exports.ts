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

async function fetchCsv(path: string, cookie: string, expectedText: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { cookie } });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/csv")) throw new Error(`${path}: expected text/csv response, got "${contentType}".`);
  const disposition = response.headers.get("content-disposition") || "";
  if (!disposition.includes("attachment")) throw new Error(`${path}: expected attachment content-disposition, got "${disposition}".`);
  const cacheControl = response.headers.get("cache-control") || "";
  if (!cacheControl.toLowerCase().includes("no-store")) throw new Error(`${path}: expected cache-control no-store, got "${cacheControl}".`);
  const contentTypeOptions = response.headers.get("x-content-type-options") || "";
  if (contentTypeOptions.toLowerCase() !== "nosniff") throw new Error(`${path}: expected x-content-type-options nosniff, got "${contentTypeOptions}".`);
  if (!body.includes(expectedText)) throw new Error(`${path}: CSV is missing expected text "${expectedText}".`);
}

async function fetchDenied(path: string, label: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined;
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers });
  const body = await response.text();
  if (response.status !== 401) throw new Error(`${label}: expected HTTP 401 for ${path}, got ${response.status}. Body: ${body.slice(0, 240)}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) throw new Error(`${label}: denied export should not return text/csv for ${path}.`);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const cookie = `${sessionCookie}=${tokenFor(admin)}`;
  const limitedUser = await prisma.user.findFirst({ where: { status: "ACTIVE", role: { in: ["SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"] } } });

  const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" }, select: { sku: true } });
  const category = await prisma.category.findFirst({ orderBy: { updatedAt: "desc" }, select: { name: true } });
  const exportedUser = await prisma.user.findFirst({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, select: { email: true } });
  const order = await prisma.order.findFirst({ orderBy: { updatedAt: "desc" }, select: { orderCode: true } });
  const customer = await prisma.customer.findFirst({ orderBy: { updatedAt: "desc" }, select: { name: true } });
  const timeline = await prisma.customerTimeline.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true } });
  const payment = await prisma.paymentTransaction.findFirst({ orderBy: { createdAt: "desc" }, include: { order: { select: { orderCode: true } } } });
  const shipment = await prisma.shipment.findFirst({ orderBy: { createdAt: "desc" }, include: { order: { select: { orderCode: true } } } });
  const purchase = await prisma.purchaseOrder.findFirst({ orderBy: { updatedAt: "desc" }, include: { supplier: { select: { name: true } } } });
  const debt = await prisma.debt.findFirst({ orderBy: { updatedAt: "desc" }, include: { customer: { select: { name: true } }, supplier: { select: { name: true } } } });
  const expense = await prisma.expense.findFirst({ orderBy: { updatedAt: "desc" }, select: { title: true } });
  const auditLog = await prisma.activityLog.findFirst({ orderBy: { createdAt: "desc" }, select: { action: true } });
  const notification = await prisma.notification.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true } });
  const returnRequest = await prisma.returnRequest.findFirst({ orderBy: { updatedAt: "desc" }, select: { code: true } });
  const promotion = await prisma.promotion.findFirst({ orderBy: { updatedAt: "desc" }, select: { code: true } });

  const checks: Array<{ path: string; expected: string }> = [
    { path: product ? `/api/admin/products/export?search=${encodeURIComponent(product.sku)}` : "/api/admin/products/export", expected: product?.sku || "sku" },
    { path: product ? `/api/admin/inventory/export?search=${encodeURIComponent(product.sku)}` : "/api/admin/inventory/export", expected: product?.sku || "sku" },
    { path: category ? `/api/admin/categories/export?search=${encodeURIComponent(category.name)}` : "/api/admin/categories/export", expected: category?.name || "name" },
    { path: exportedUser ? `/api/admin/users/export?search=${encodeURIComponent(exportedUser.email)}` : "/api/admin/users/export", expected: exportedUser?.email || "email" },
    { path: order ? `/api/admin/orders/export?search=${encodeURIComponent(order.orderCode)}` : "/api/admin/orders/export", expected: order?.orderCode || "orderCode" },
    { path: customer ? `/api/admin/customers/export?search=${encodeURIComponent(customer.name)}` : "/api/admin/customers/export", expected: customer?.name || "name" },
    { path: timeline ? `/api/admin/customers/timeline/export?search=${encodeURIComponent(timeline.title)}` : "/api/admin/customers/timeline/export", expected: timeline?.title || "createdAt" },
    { path: payment ? `/api/admin/finance/payments/export?search=${encodeURIComponent(payment.order.orderCode)}` : "/api/admin/finance/payments/export", expected: payment?.order.orderCode || "orderCode" },
    { path: shipment ? `/api/admin/shipments/export?search=${encodeURIComponent(shipment.order.orderCode)}` : "/api/admin/shipments/export", expected: shipment?.order.orderCode || "orderCode" },
    { path: purchase ? `/api/admin/purchases/export?search=${encodeURIComponent(purchase.code)}` : "/api/admin/purchases/export", expected: purchase?.code || "code" },
    { path: purchase?.supplier?.name ? `/api/admin/suppliers/export?search=${encodeURIComponent(purchase.supplier.name)}` : "/api/admin/suppliers/export", expected: purchase?.supplier?.name || "name" },
    { path: debt?.customer?.name || debt?.supplier?.name ? `/api/admin/finance/debts/export?search=${encodeURIComponent(debt.customer?.name || debt.supplier?.name || "")}` : "/api/admin/finance/debts/export", expected: debt?.customer?.name || debt?.supplier?.name || "party" },
    { path: expense ? `/api/admin/finance/expenses/export?search=${encodeURIComponent(expense.title)}` : "/api/admin/finance/expenses/export", expected: expense?.title || "title" },
    { path: "/api/admin/reports/export?tab=sales", expected: order?.orderCode || "orderCode" },
    { path: "/api/admin/reports/export?tab=products", expected: "sku" },
    { path: "/api/admin/reports/export?tab=inventory", expected: "sku" },
    { path: "/api/admin/reports/export?tab=debts", expected: "party" },
    { path: auditLog ? `/api/admin/audit/export?search=${encodeURIComponent(auditLog.action)}` : "/api/admin/audit/export", expected: auditLog?.action || "action" },
    { path: notification ? `/api/admin/notifications/export?search=${encodeURIComponent(notification.title)}` : "/api/admin/notifications/export", expected: notification?.title || "title" },
    { path: returnRequest ? `/api/admin/returns/export?search=${encodeURIComponent(returnRequest.code)}` : "/api/admin/returns/export", expected: returnRequest?.code || "code" },
    { path: promotion ? `/api/admin/promotions/export?search=${encodeURIComponent(promotion.code)}` : "/api/admin/promotions/export", expected: promotion?.code || "code" },
    { path: "/api/admin/automation/export", expected: "jobType" },
  ];

  for (const check of checks) {
    await fetchCsv(check.path, cookie, check.expected);
  }

  for (const check of checks) {
    await fetchDenied(check.path, "Anonymous export guard");
  }

  if (limitedUser) {
    const limitedCookie = `${sessionCookie}=${tokenFor(limitedUser)}`;
    await fetchDenied("/api/admin/users/export", "Role export guard", limitedCookie);
  }

  console.log(`ShopOnline admin exports smoke passed (${checks.length} endpoints, anonymous guard${limitedUser ? ", role guard" : ""})`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
