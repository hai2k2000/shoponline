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

function locationOf(response: Response) {
  return response.headers.get("location") || "";
}

function assertRedirect(response: Response, expectedPath: string, label: string) {
  const location = locationOf(response);
  if (response.status < 300 || response.status >= 400 || !location.includes(expectedPath)) {
    throw new Error(`${label}: expected redirect to ${expectedPath}, got ${response.status} ${location}.`);
  }
}

async function get(path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: token ? { cookie: `${sessionCookie}=${token}` } : undefined,
  });
}

async function post(path: string, values: Record<string, string | number | null>, token?: string) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== null) body.set(key, String(value));
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    body,
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(token ? { cookie: `${sessionCookie}=${token}` } : {}),
    },
  });
}

async function main() {
  const stamp = Date.now().toString().slice(-8);

  const unauthDashboard = await get("/admin/dashboard");
  assertRedirect(unauthDashboard, "/admin/login", "Unauthenticated admin dashboard");
  if (!locationOf(unauthDashboard).includes("next=%2Fadmin%2Fdashboard") && !locationOf(unauthDashboard).includes("next=/admin/dashboard")) {
    throw new Error(`Unauthenticated admin dashboard: missing next param in ${locationOf(unauthDashboard)}.`);
  }

  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const adminToken = tokenFor(admin);

  const authedDashboard = await get("/admin/dashboard", adminToken);
  if (authedDashboard.status !== 200) {
    throw new Error(`Authenticated admin dashboard: expected HTTP 200, got ${authedDashboard.status}.`);
  }

  const tamperedDashboard = await get("/admin/dashboard", `${adminToken.slice(0, -4)}fake`);
  assertRedirect(tamperedDashboard, "/admin/login", "Tampered admin cookie");

  const unauthSettings = await post("/api/admin/settings", { storeName: "ShopOnline", shippingFee: 0 });
  assertRedirect(unauthSettings, "/admin/login", "Unauthenticated settings POST");

  const inactive = await prisma.user.upsert({
    where: { email: `smoke-inactive-${stamp}@shoponline.local` },
    update: { status: "ARCHIVED", role: "ADMIN" },
    create: { name: `Smoke Inactive ${stamp}`, email: `smoke-inactive-${stamp}@shoponline.local`, passwordHash: "not-used", role: "ADMIN", status: "ARCHIVED" },
  });
  const inactiveSettings = await post("/api/admin/settings", { sessionToken: tokenFor(inactive), storeName: "ShopOnline", shippingFee: 0 });
  assertRedirect(inactiveSettings, "/admin/login", "Inactive user session token");

  const sales = await prisma.user.upsert({
    where: { email: `smoke-auth-sales-${stamp}@shoponline.local` },
    update: { status: "ACTIVE", role: "SALES" },
    create: { name: `Smoke Auth Sales ${stamp}`, email: `smoke-auth-sales-${stamp}@shoponline.local`, passwordHash: "not-used", role: "SALES", status: "ACTIVE" },
  });
  const deniedSettings = await post("/api/admin/settings", { sessionToken: tokenFor(sales), storeName: "ShopOnline", shippingFee: 0 });
  assertRedirect(deniedSettings, "/admin/settings", "Unauthorized settings role");

  console.log("ShopOnline admin auth smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
