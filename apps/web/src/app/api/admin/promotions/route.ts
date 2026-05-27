import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function numberValue(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function intValue(formData: FormData, key: string) { const raw = Number(formData.get(key) || 0); return raw > 0 ? Math.floor(raw) : null; }
function nullableDate(value: FormDataEntryValue | null) { const raw = String(value || "").trim(); return raw ? new Date(raw) : null; }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/promotions"), { status: 303 });
  const code = text(formData, "code").toUpperCase();
  const name = text(formData, "name");
  if (!code || !name) return NextResponse.redirect(publicUrl(request, "/admin/promotions"), { status: 303 });
  const maxDiscount = numberValue(formData, "maxDiscount");
  await prisma.promotion.create({
    data: {
      code,
      name,
      discountType: text(formData, "discountType") === "PERCENT" ? "PERCENT" : "FIXED",
      discountValue: numberValue(formData, "discountValue"),
      minOrder: numberValue(formData, "minOrder"),
      maxDiscount: maxDiscount > 0 ? maxDiscount : null,
      usageLimit: intValue(formData, "usageLimit"),
      endsAt: nullableDate(formData.get("endsAt")),
      status: "ACTIVE",
    },
  });
  return NextResponse.redirect(publicUrl(request, "/admin/promotions"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
