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

async function checkPage(path: string, expected: string, cookie?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`${path} expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  }
  if (!body.includes(expected)) {
    throw new Error(`${path} did not include expected text "${expected}".`);
  }
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@shoponline.local", status: "ACTIVE" } });
  if (!admin) throw new Error("Missing admin user.");
  const adminCookie = `${sessionCookie}=${tokenFor(admin)}`;

  const publicPages: Array<[string, string]> = [
    ["/", "ShopOnline"],
    ["/products", "Sản phẩm"],
    ["/cart", "Giỏ hàng"],
    ["/checkout", "Thanh toán"],
    ["/tracking", "Tra cứu đơn hàng"],
    ["/admin/login", "Đăng nhập"],
  ];
  for (const [path, expected] of publicPages) await checkPage(path, expected);

  const adminPages: Array<[string, string]> = [
    ["/admin/dashboard", "Dashboard điều hành"],
    ["/admin/products", "Sản phẩm"],
    ["/admin/categories", "Danh mục"],
    ["/admin/inventory", "Kho hàng"],
    ["/admin/orders", "Đơn hàng"],
    ["/admin/customers", "Khách hàng"],
    ["/admin/customers/timeline", "CSKH"],
    ["/admin/suppliers", "Nhà cung cấp"],
    ["/admin/finance/expenses", "Chi phí"],
    ["/admin/finance/debts", "Công nợ"],
    ["/admin/finance/payments", "Thanh toán"],
    ["/admin/shipments", "Vận chuyển"],
    ["/admin/purchases", "Nhập hàng"],
    ["/admin/returns", "Trả hàng"],
    ["/admin/promotions", "Khuyến mãi"],
    ["/admin/reports", "Báo cáo"],
    ["/admin/users", "Người dùng"],
    ["/admin/settings", "Cài đặt"],
    ["/admin/audit", "Nhật ký hệ thống"],
    ["/admin/automation", "Tự động hóa"],
    ["/admin/notifications", "Thông báo"],
  ];
  for (const [path, expected] of adminPages) await checkPage(path, expected, adminCookie);

  console.log("ShopOnline UAT page smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
