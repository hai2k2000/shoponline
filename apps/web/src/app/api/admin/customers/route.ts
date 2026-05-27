import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/customers"), { status: 303 });
  const mode = text(formData, "mode");
  const name = text(formData, "name");
  if (!name || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/customers"), { status: 303 });

  if (mode === "create") {
    const customer = await prisma.customer.create({ data: customerData(formData, name) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Customer", entityId: customer.id, description: `Tạo khách hàng ${customer.name}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/customers"), { status: 303 });
    const customer = await prisma.customer.update({ where: { id }, data: customerData(formData, name) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Customer", entityId: customer.id, description: `Cập nhật khách hàng ${customer.name}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/customers"), { status: 303 });
}

function customerData(formData: FormData, name: string) {
  return {
    name,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    address: text(formData, "address") || null,
    source: text(formData, "source") || null,
    group: text(formData, "group") || null,
    notes: text(formData, "notes") || null,
    status: status(formData),
  };
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
