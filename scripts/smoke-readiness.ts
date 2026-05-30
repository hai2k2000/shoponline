import "dotenv/config";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3002";

async function fetchRaw(path: string, redirect: RequestRedirect = "follow") {
  const response = await fetch(`${baseUrl}${path}`, { redirect });
  const text = await response.text();
  return { response, text };
}

function assertIncludes(body: string, text: string, label: string) {
  if (!body.includes(text)) throw new Error(`${label}: missing "${text}".`);
}

function assertNotIncludes(body: string, text: string, label: string) {
  if (body.includes(text)) throw new Error(`${label}: still includes "${text}".`);
}

async function main() {
  const root = await fetchRaw("/", "manual");
  if (root.response.status !== 307) throw new Error(`Root lock: expected HTTP 307, got ${root.response.status}.`);
  const location = root.response.headers.get("location") || "";
  if (!location.includes("/admin/login")) throw new Error(`Root lock: expected redirect to admin login, got "${location}".`);
  if (!location.includes("next=%2Fadmin%2Fdashboard")) throw new Error(`Root lock: expected dashboard next target, got "${location}".`);

  const login = await fetchRaw("/admin/login");
  if (login.response.status !== 200) throw new Error(`/admin/login failed HTTP ${login.response.status}: ${login.text.slice(0, 300)}`);
  assertIncludes(login.text, "ShopOnline Admin", "Admin login");
  assertIncludes(login.text, "Đăng nhập quản trị", "Admin login");
  assertNotIncludes(login.text, "Về website", "Admin login locked public link");
  for (const broken of ["??ng", "qu?n", "D?ng", "V? website", "m?t kh?u", "T?i kho?n"]) {
    assertNotIncludes(login.text, broken, "Admin login mojibake check");
  }

  const health = await fetchRaw("/api/health");
  if (health.response.status !== 200) throw new Error(`/api/health failed HTTP ${health.response.status}: ${health.text.slice(0, 300)}`);
  assertIncludes(health.text, "\"ok\":true", "Health endpoint");

  console.log("ShopOnline readiness smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
