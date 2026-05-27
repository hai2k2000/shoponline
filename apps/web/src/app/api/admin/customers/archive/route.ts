import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/customers"), { status: 303 });
  const id = text(formData, "id");
  if (!id) return NextResponse.redirect(publicUrl(request, "/admin/customers"), { status: 303 });
  const customer = await prisma.customer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "ARCHIVE", entityType: "Customer", entityId: customer.id, description: `Lưu trữ khách hàng ${customer.name}` } });
  return NextResponse.redirect(publicUrl(request, "/admin/customers"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
