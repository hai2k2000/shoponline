import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type UserRole = "ADMIN" | "MANAGER" | "SALES" | "WAREHOUSE" | "ACCOUNTANT" | "MARKETING";
type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function role(formData: FormData): UserRole {
  const value = text(formData, "role");
  return ["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"].includes(value) ? (value as UserRole) : "SALES";
}
function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const admin = await getAdminFromForm(formData);
  if (!admin) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/users"), { status: 303 });
  if (!["ADMIN", "MANAGER"].includes(admin.role)) return NextResponse.redirect(publicUrl(request, "/admin/dashboard"), { status: 303 });
  const mode = text(formData, "mode");
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  if (!name || !email || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });

  if (mode === "create") {
    const password = text(formData, "password");
    if (password.length < 6) return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });
    const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: role(formData), status: status(formData) } });
    await prisma.activityLog.create({ data: { userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id, description: `Tạo người dùng ${user.email}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });
    const user = await prisma.user.update({ where: { id }, data: { name, email, role: role(formData), status: status(formData) } });
    await prisma.activityLog.create({ data: { userId: admin.id, action: "UPDATE", entityType: "User", entityId: user.id, description: `Cập nhật người dùng ${user.email}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/users"), { status: 303 });
}

async function getAdminFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
