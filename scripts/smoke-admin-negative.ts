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
  return fetch(`${baseUrl}${path}`, { method: "POST", body, redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" } });
}

function locationOf(response: Response) {
  return response.headers.get("location") || "";
}

function assertRedirect(response: Response, expectedPath: string, expectedError: string, label: string) {
  const location = locationOf(response);
  if (response.status !== 303 || !location.includes(expectedPath) || !location.includes(`error=${expectedError}`)) {
    throw new Error(`${label}: expected ${expectedError} redirect to ${expectedPath}, got ${response.status} ${location}.`);
  }
}

async function main() {
  const stamp = Date.now().toString().slice(-8);
  const sales = await prisma.user.upsert({
    where: { email: `smoke-sales-${stamp}@shoponline.local` },
    update: { status: "ACTIVE", role: "SALES" },
    create: { name: `Smoke Sales ${stamp}`, email: `smoke-sales-${stamp}@shoponline.local`, passwordHash: "not-used", role: "SALES", status: "ACTIVE" },
  });
  const salesToken = tokenFor(sales);

  const denied = await post("/api/admin/inventory", { sessionToken: salesToken, mode: "import", productId: "not-allowed", quantity: 1 });
  if (denied.status !== 303 || !locationOf(denied).includes("/admin/inventory")) {
    throw new Error(`Expected RBAC denial redirect to /admin/inventory, got ${denied.status} ${locationOf(denied)}.`);
  }

  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const adminToken = tokenFor(admin);

  const validation = await post("/api/admin/inventory", { sessionToken: adminToken, mode: "import", productId: "", quantity: 0 });
  assertRedirect(validation, "/admin/inventory", "VALIDATION_ERROR", "Inventory validation");

  const missingOrder = await post("/api/admin/payments", { sessionToken: adminToken, orderId: "missing-order", amount: 1000, method: "CASH" });
  assertRedirect(missingOrder, "/admin/finance/payments", "NOT_FOUND", "Payment not-found");

  const categoryMissingId = await post("/api/admin/categories", { sessionToken: adminToken, mode: "update", name: "Missing category", sortOrder: 0, status: "ACTIVE" });
  assertRedirect(categoryMissingId, "/admin/categories", "VALIDATION_ERROR", "Category missing id");

  const customerArchiveMissingId = await post("/api/admin/customers/archive", { sessionToken: adminToken, id: "" });
  assertRedirect(customerArchiveMissingId, "/admin/customers", "VALIDATION_ERROR", "Customer archive missing id");

  const debtMissingCustomer = await post("/api/admin/debts", { sessionToken: adminToken, mode: "create", type: "CUSTOMER", amount: 1000, paidAmount: 0 });
  assertRedirect(debtMissingCustomer, "/admin/finance/debts", "VALIDATION_ERROR", "Debt missing customer");

  const userShortPassword = await post("/api/admin/users", { sessionToken: adminToken, mode: "create", name: "Smoke Invalid User", email: `invalid-${stamp}@shoponline.local`, password: "123", role: "SALES", status: "ACTIVE" });
  assertRedirect(userShortPassword, "/admin/users", "VALIDATION_ERROR", "User short password");

  console.log("ShopOnline admin negative smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
