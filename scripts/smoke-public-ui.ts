import "dotenv/config";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";

const publicRoutes: Array<{ path: string; title: string; required: string[] }> = [
  { path: "/", title: "Cửa hàng trực tuyến", required: ["Xem sản phẩm", "Sản phẩm mới", "Tra cứu đơn", "Xem chi tiết"] },
  { path: "/products", title: "Danh sách sản phẩm", required: ["Tìm kiếm sản phẩm", "Thêm vào giỏ"] },
  { path: "/cart", title: "Giỏ hàng", required: ["Tiếp tục mua", "Thanh toán", "Tạm tính"] },
  { path: "/checkout", title: "Thanh toán", required: ["Họ tên", "Số điện thoại", "Đặt hàng", "Tạm tính"] },
  { path: "/tracking", title: "Tra cứu đơn hàng", required: ["Mã đơn", "Tiếp tục mua hàng"] },
];

function assertNoRenderError(body: string, path: string) {
  const lower = body.toLowerCase();
  for (const signal of ["application error", "internal server error", "hydration failed", "runtime error", "uncaught error"]) {
    if (lower.includes(signal)) throw new Error(`${path}: page contains error signal "${signal}".`);
  }
}

async function checkRoute(route: { path: string; title: string; required: string[] }) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: "manual" });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${route.path}: expected HTTP 200, got ${response.status}. Body: ${body.slice(0, 240)}`);
  assertNoRenderError(body, route.path);
  for (const text of [route.title, ...route.required]) {
    if (!body.includes(text)) throw new Error(`${route.path}: missing expected UI text "${text}".`);
  }
}

async function main() {
  for (const route of publicRoutes) await checkRoute(route);
  console.log(`ShopOnline public UI smoke passed (${publicRoutes.length} routes)`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
