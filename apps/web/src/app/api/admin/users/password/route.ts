import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const admin = await getAdminFromForm(formData);
  if (!admin) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/users"), { status: 303 });
  if (!["ADMIN", "MANAGER"].includes(admin.role)) return NextResponse.redirect(publicUrl(request, "/admin/dashboard"), { status: 303 });
  const id = text(formData, "id");
  const password = text(formData, "password");
  if (!id || password.length < 6) return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });
  const user = await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "RESET_PASSWORD", entityType: "User", entityId: user.id, description: `Reset mật khẩu ${user.email}` } });
  return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });
}

async function getAdminFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
