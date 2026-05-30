import "dotenv/config";
import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";
const secret = process.env.AUTH_SECRET || "change-this-before-production";
const sessionCookie = "shoponline.session";

type UiRoute = {
  path: string;
  title: string;
  table?: boolean;
  createText?: string;
  requireText?: string[];
};

const adminRoutes: UiRoute[] = [
  { path: "/admin/dashboard", title: "Dashboard điều hành", requireText: ["Doanh thu", "Đơn hàng"] },
  { path: "/admin/orders", title: "Đơn hàng", table: true, createText: "Tạo đơn hàng" },
  { path: "/admin/products", title: "Sản phẩm", table: true, createText: "Tạo sản phẩm" },
  { path: "/admin/categories", title: "Quản lý danh mục", table: true, createText: "Tạo danh mục" },
  { path: "/admin/inventory", title: "Kho hàng", table: true },
  { path: "/admin/customers", title: "Khách hàng", table: true, createText: "Tạo khách hàng" },
  { path: "/admin/customers/timeline", title: "CSKH", requireText: ["Tạo ghi chú", "Tìm kiếm"] },
  { path: "/admin/suppliers", title: "Quản lý nhà cung cấp", table: true, createText: "Tạo nhà cung cấp" },
  { path: "/admin/finance/expenses", title: "Quản lý chi phí", table: true, createText: "Tạo chi phí" },
  { path: "/admin/finance/debts", title: "Quản lý công nợ", table: true, createText: "Tạo công nợ" },
  { path: "/admin/finance/payments", title: "Giao dịch thanh toán", table: true, createText: "Ghi nhận thanh toán" },
  { path: "/admin/shipments", title: "Quản lý vận đơn", table: true, createText: "Tạo vận đơn" },
  { path: "/admin/purchases", title: "Đơn nhập hàng", table: true, createText: "Tạo đơn nhập" },
  { path: "/admin/returns", title: "Trả hàng và hoàn tiền", table: true, createText: "Tạo yêu cầu" },
  { path: "/admin/promotions", title: "Khuyến mãi", table: true, createText: "Tạo mã" },
  { path: "/admin/reports", title: "Báo cáo", requireText: ["Doanh thu", "Lợi nhuận"] },
  { path: "/admin/users", title: "Quản lý người dùng", table: true, createText: "Tạo người dùng" },
  { path: "/admin/settings", title: "Cài đặt cửa hàng", requireText: ["Lưu cài đặt", "Chính sách tồn kho"] },
  { path: "/admin/audit", title: "Nhật ký hệ thống", table: true, requireText: ["Tìm kiếm", "Nghiệp vụ"] },
  { path: "/admin/automation", title: "Tự động hóa vận hành", requireText: ["Lịch sử chạy automation", "Tổng lần chạy"] },
  { path: "/admin/system", title: "System status", requireText: ["release:readiness", "Business data snapshot", "Operator UAT checklist"] },
  { path: "/admin/notifications", title: "Thông báo", table: true, requireText: ["Đánh dấu đã đọc"] },
];

function tokenFor(user: { id: string; email: string; role: string }) {
  const body = Buffer.from(JSON.stringify({ userId: user.id, email: user.email, role: user.role, exp: Date.now() + 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function assertIncludes(body: string, text: string, path: string) {
  if (!body.includes(text)) throw new Error(`${path}: missing expected UI text "${text}".`);
}

function assertNoRenderError(body: string, path: string) {
  const lower = body.toLowerCase();
  const badSignals = ["application error", "internal server error", "hydration failed", "runtime error", "uncaught error"];
  for (const signal of badSignals) {
    if (lower.includes(signal)) throw new Error(`${path}: page contains error signal "${signal}".`);
  }
}

function assertTablePattern(body: string, route: UiRoute) {
  assertIncludes(body, "Tìm kiếm", route.path);
  if (!body.includes("<table") && !body.includes("role=\"table\"")) throw new Error(`${route.path}: expected table/list-first markup.`);
  if (route.createText) assertIncludes(body, route.createText, route.path);
}

async function checkRoute(route: UiRoute, cookie: string) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: "manual", headers: { cookie } });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${route.path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  assertNoRenderError(body, route.path);
  assertIncludes(body, route.title, route.path);
  for (const text of route.requireText || []) assertIncludes(body, text, route.path);
  if (route.table) assertTablePattern(body, route);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const cookie = `${sessionCookie}=${tokenFor(admin)}`;

  for (const route of adminRoutes) await checkRoute(route, cookie);
  console.log(`ShopOnline admin UI smoke passed (${adminRoutes.length} routes)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
