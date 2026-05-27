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
  const sessionToken = tokenFor(admin);
  const stamp = Date.now().toString().slice(-8);

  const customerPhone = `09${stamp}`;
  await post("/api/admin/customers", { sessionToken, mode: "create", name: `Smoke Customer ${stamp}`, phone: customerPhone, email: null, address: null, source: "Smoke", group: "Test", notes: "crm finance smoke", status: "ACTIVE" });
  const customer = await prisma.customer.findFirstOrThrow({ where: { phone: customerPhone }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/customers", { sessionToken, mode: "update", id: customer.id, name: `Smoke Customer Updated ${stamp}`, phone: customerPhone, email: null, address: null, source: "Smoke", group: "Test", notes: "updated", status: "ACTIVE" });

  const taxCode = `TAX-${stamp}`;
  await post("/api/admin/suppliers", { sessionToken, mode: "create", name: `Smoke Supplier ${stamp}`, phone: null, email: null, address: null, taxCode, note: "crm finance smoke", status: "ACTIVE" });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { taxCode }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/suppliers", { sessionToken, mode: "update", id: supplier.id, name: `Smoke Supplier Updated ${stamp}`, phone: null, email: null, address: null, taxCode, note: "updated", status: "ACTIVE" });

  const expenseTitle = `Smoke Expense ${stamp}`;
  await post("/api/admin/expenses", { sessionToken, mode: "create", title: expenseTitle, category: "Smoke", amount: 12345, note: "crm finance smoke", status: "ACTIVE" });
  const expense = await prisma.expense.findFirstOrThrow({ where: { title: expenseTitle }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/expenses", { sessionToken, mode: "update", id: expense.id, title: `${expenseTitle} Updated`, category: "Smoke", amount: 23456, note: "updated", status: "ACTIVE" });

  await post("/api/admin/debts", { sessionToken, mode: "create", type: "CUSTOMER", customerId: customer.id, supplierId: null, amount: 50000, paidAmount: 10000, dueDate: null, note: `Smoke Debt ${stamp}` });
  const debt = await prisma.debt.findFirstOrThrow({ where: { customerId: customer.id, note: `Smoke Debt ${stamp}` }, orderBy: { createdAt: "desc" } });
  await post("/api/admin/debts/payment", { sessionToken, id: debt.id, payment: 40000 });
  const paidDebt = await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } });
  if (paidDebt.status !== "PAID") throw new Error(`Expected PAID debt, got ${paidDebt.status}.`);
  await post("/api/admin/debts/close", { sessionToken, id: debt.id });
  const closedDebt = await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } });
  if (closedDebt.status !== "CLOSED") throw new Error(`Expected CLOSED debt, got ${closedDebt.status}.`);

  await post("/api/admin/expenses/archive", { sessionToken, id: expense.id });
  await post("/api/admin/suppliers/archive", { sessionToken, id: supplier.id });
  await post("/api/admin/customers/archive", { sessionToken, id: customer.id });

  console.log("ShopOnline admin CRM/finance smoke passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
