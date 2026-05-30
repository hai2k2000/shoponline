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

function assertIncludes(body: string, text: string, path: string) {
  if (!body.includes(text)) throw new Error(`${path}: missing expected text "${text}".`);
}

async function fetchAdmin(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { cookie } });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  return body;
}

async function fetchCsv(path: string, cookie: string, expectedText: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { cookie } });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/csv")) throw new Error(`${path}: expected text/csv response, got "${contentType}".`);
  if (!body.includes(expectedText)) throw new Error(`${path}: CSV is missing expected text "${expectedText}".`);
  return body;
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const cookie = `${sessionCookie}=${tokenFor(admin)}`;

  const product = await prisma.product.findFirst({ orderBy: { updatedAt: "desc" }, select: { sku: true, id: true } });
  if (!product) throw new Error("Missing product data for catalog workflow smoke.");

  const productBody = await fetchAdmin(`/admin/products?search=${encodeURIComponent(product.sku)}`, cookie);
  assertIncludes(productBody, product.sku, "/admin/products");
  assertIncludes(productBody, "CSV", "/admin/products");
  assertIncludes(productBody, "/admin/inventory?search=", "/admin/products");
  assertIncludes(productBody, "/admin/purchases?", "/admin/products");
  await fetchCsv(`/api/admin/products/export?search=${encodeURIComponent(product.sku)}`, cookie, product.sku);

  const inventoryBody = await fetchAdmin(`/admin/inventory?search=${encodeURIComponent(product.sku)}`, cookie);
  assertIncludes(inventoryBody, product.sku, "/admin/inventory");
  assertIncludes(inventoryBody, "CSV", "/admin/inventory");
  assertIncludes(inventoryBody, "Inventory risk dashboard", "/admin/inventory");
  assertIncludes(inventoryBody, "Hang cham luan chuyen", "/admin/inventory");
  assertIncludes(inventoryBody, "/admin/products?search=", "/admin/inventory");
  assertIncludes(inventoryBody, "/admin/purchases?", "/admin/inventory");
  await fetchCsv(`/api/admin/inventory/export?search=${encodeURIComponent(product.sku)}`, cookie, product.sku);

  const category = await prisma.category.findFirst({ orderBy: { updatedAt: "desc" }, select: { name: true } });
  if (category) {
    const categoriesBody = await fetchAdmin(`/admin/categories?search=${encodeURIComponent(category.name)}`, cookie);
    assertIncludes(categoriesBody, category.name, "/admin/categories");
    assertIncludes(categoriesBody, "CSV", "/admin/categories");
    await fetchCsv(`/api/admin/categories/export?search=${encodeURIComponent(category.name)}`, cookie, category.name);
  }

  const exportedUser = await prisma.user.findFirst({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, select: { email: true } });
  if (exportedUser) {
    const usersBody = await fetchAdmin("/admin/users", cookie);
    assertIncludes(usersBody, "CSV", "/admin/users");
    await fetchCsv(`/api/admin/users/export?search=${encodeURIComponent(exportedUser.email)}`, cookie, exportedUser.email);
  }

  const order = await prisma.order.findFirst({ orderBy: { updatedAt: "desc" }, select: { orderCode: true } });
  if (order) {
    const orderBody = await fetchAdmin(`/admin/orders?search=${encodeURIComponent(order.orderCode)}`, cookie);
    assertIncludes(orderBody, order.orderCode, "/admin/orders");
    assertIncludes(orderBody, "CSV", "/admin/orders");
    await fetchCsv(`/api/admin/orders/export?search=${encodeURIComponent(order.orderCode)}`, cookie, order.orderCode);
  }

  const customer = await prisma.customer.findFirst({ orderBy: { updatedAt: "desc" }, select: { name: true } });
  if (customer) {
    const customersBody = await fetchAdmin(`/admin/customers?search=${encodeURIComponent(customer.name)}`, cookie);
    assertIncludes(customersBody, customer.name, "/admin/customers");
    assertIncludes(customersBody, "CSV", "/admin/customers");
    await fetchCsv(`/api/admin/customers/export?search=${encodeURIComponent(customer.name)}`, cookie, customer.name);
  }

  const timeline = await prisma.customerTimeline.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true } });
  const timelineBody = await fetchAdmin(timeline ? `/admin/customers/timeline?search=${encodeURIComponent(timeline.title)}` : "/admin/customers/timeline", cookie);
  assertIncludes(timelineBody, "CSV", "/admin/customers/timeline");
  await fetchCsv(timeline ? `/api/admin/customers/timeline/export?search=${encodeURIComponent(timeline.title)}` : "/api/admin/customers/timeline/export", cookie, timeline?.title || "createdAt");

  const payment = await prisma.paymentTransaction.findFirst({ orderBy: { createdAt: "desc" }, include: { order: { select: { orderCode: true } } } });
  if (payment) {
    const paymentsBody = await fetchAdmin(`/admin/finance/payments?search=${encodeURIComponent(payment.order.orderCode)}`, cookie);
    assertIncludes(paymentsBody, payment.order.orderCode, "/admin/finance/payments");
    assertIncludes(paymentsBody, "CSV", "/admin/finance/payments");
    assertIncludes(paymentsBody, "/admin/orders?search=", "/admin/finance/payments");
    await fetchCsv(`/api/admin/finance/payments/export?search=${encodeURIComponent(payment.order.orderCode)}`, cookie, payment.order.orderCode);
  }

  const shipment = await prisma.shipment.findFirst({ orderBy: { createdAt: "desc" }, include: { order: { select: { orderCode: true } } } });
  if (shipment) {
    const shipmentsBody = await fetchAdmin(`/admin/shipments?search=${encodeURIComponent(shipment.order.orderCode)}`, cookie);
    assertIncludes(shipmentsBody, shipment.order.orderCode, "/admin/shipments");
    assertIncludes(shipmentsBody, "CSV", "/admin/shipments");
    assertIncludes(shipmentsBody, "/admin/orders?search=", "/admin/shipments");
    assertIncludes(shipmentsBody, "/admin/finance/payments?search=", "/admin/shipments");
    await fetchCsv(`/api/admin/shipments/export?search=${encodeURIComponent(shipment.order.orderCode)}`, cookie, shipment.order.orderCode);
  }

  const purchase = await prisma.purchaseOrder.findFirst({ orderBy: { updatedAt: "desc" }, include: { supplier: { select: { name: true } } } });
  if (purchase) {
    const purchasesBody = await fetchAdmin(`/admin/purchases?search=${encodeURIComponent(purchase.code)}`, cookie);
    assertIncludes(purchasesBody, purchase.code, "/admin/purchases");
    await fetchCsv(`/api/admin/purchases/export?search=${encodeURIComponent(purchase.code)}`, cookie, purchase.code);

    if (purchase.supplier?.name) {
      const suppliersBody = await fetchAdmin(`/admin/suppliers?search=${encodeURIComponent(purchase.supplier.name)}`, cookie);
      assertIncludes(suppliersBody, purchase.supplier.name, "/admin/suppliers");
      await fetchCsv(`/api/admin/suppliers/export?search=${encodeURIComponent(purchase.supplier.name)}`, cookie, purchase.supplier.name);
    }
  }

  const debt = await prisma.debt.findFirst({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });
  if (debt) {
    const partyName = debt.customer?.name || debt.supplier?.name || "";
    if (partyName) {
      const debtsBody = await fetchAdmin(`/admin/finance/debts?search=${encodeURIComponent(partyName)}`, cookie);
      assertIncludes(debtsBody, partyName, "/admin/finance/debts");
      await fetchCsv(`/api/admin/finance/debts/export?search=${encodeURIComponent(partyName)}`, cookie, partyName);
    }
  }

  const expense = await prisma.expense.findFirst({ orderBy: { updatedAt: "desc" }, select: { title: true } });
  if (expense) {
    const expensesBody = await fetchAdmin(`/admin/finance/expenses?search=${encodeURIComponent(expense.title)}`, cookie);
    assertIncludes(expensesBody, expense.title, "/admin/finance/expenses");
    await fetchCsv(`/api/admin/finance/expenses/export?search=${encodeURIComponent(expense.title)}`, cookie, expense.title);
  }

  const reportsBody = await fetchAdmin("/admin/reports", cookie);
  assertIncludes(reportsBody, "CSV", "/admin/reports");
  await fetchCsv("/api/admin/reports/export?tab=sales", cookie, order?.orderCode || "orderCode");
  await fetchCsv("/api/admin/reports/export?tab=products", cookie, "sku");
  await fetchCsv("/api/admin/reports/export?tab=inventory", cookie, "sku");
  await fetchCsv("/api/admin/reports/export?tab=debts", cookie, "party");

  const auditLog = await prisma.activityLog.findFirst({ orderBy: { createdAt: "desc" }, select: { action: true, entityType: true } });
  if (auditLog) {
    const auditBody = await fetchAdmin(`/admin/audit?search=${encodeURIComponent(auditLog.action)}`, cookie);
    assertIncludes(auditBody, "CSV", "/admin/audit");
    await fetchCsv(`/api/admin/audit/export?search=${encodeURIComponent(auditLog.action)}`, cookie, auditLog.action);
  }

  const notification = await prisma.notification.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true } });
  if (notification) {
    const notificationsBody = await fetchAdmin(`/admin/notifications?search=${encodeURIComponent(notification.title)}`, cookie);
    assertIncludes(notificationsBody, "CSV", "/admin/notifications");
    await fetchCsv(`/api/admin/notifications/export?search=${encodeURIComponent(notification.title)}`, cookie, notification.title);
  }

  const returnRequest = await prisma.returnRequest.findFirst({ orderBy: { updatedAt: "desc" }, select: { code: true } });
  const returnsBody = await fetchAdmin(returnRequest ? `/admin/returns?search=${encodeURIComponent(returnRequest.code)}` : "/admin/returns", cookie);
  assertIncludes(returnsBody, "CSV", "/admin/returns");
  await fetchCsv(returnRequest ? `/api/admin/returns/export?search=${encodeURIComponent(returnRequest.code)}` : "/api/admin/returns/export", cookie, returnRequest?.code || "code");

  const promotion = await prisma.promotion.findFirst({ orderBy: { updatedAt: "desc" }, select: { code: true } });
  const promotionsBody = await fetchAdmin(promotion ? `/admin/promotions?search=${encodeURIComponent(promotion.code)}` : "/admin/promotions", cookie);
  assertIncludes(promotionsBody, "CSV", "/admin/promotions");
  await fetchCsv(promotion ? `/api/admin/promotions/export?search=${encodeURIComponent(promotion.code)}` : "/api/admin/promotions/export", cookie, promotion?.code || "code");

  const automationBody = await fetchAdmin("/admin/automation", cookie);
  assertIncludes(automationBody, "CSV", "/admin/automation");
  await fetchCsv("/api/admin/automation/export", cookie, "jobType");

  console.log("ShopOnline catalog workflow smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
