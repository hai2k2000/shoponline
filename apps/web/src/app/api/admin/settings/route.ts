import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/settings"), { status: 303 });
  const setting = await prisma.storeSetting.upsert({
    where: { id: "default" },
    create: settingData(formData),
    update: settingData(formData),
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "StoreSetting", entityId: setting.id, description: "Cập nhật cấu hình cửa hàng" } });
  return NextResponse.redirect(publicUrl(request, "/admin/settings"), { status: 303 });
}

function settingData(formData: FormData) {
  return {
    id: "default",
    storeName: text(formData, "storeName") || "ShopOnline",
    logo: text(formData, "logo") || null,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    address: text(formData, "address") || null,
    shippingFee: money(formData, "shippingFee"),
    inventoryStrategy: text(formData, "inventoryStrategy") || "PREVENT_NEGATIVE",
  };
}

async function getUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser?.status === "ACTIVE") return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findFirst({ where: { id: session.userId, status: "ACTIVE" }, select: { id: true, name: true, email: true, role: true, status: true } });
}
