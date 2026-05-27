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
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/suppliers"), { status: 303 });
  const mode = text(formData, "mode");
  const name = text(formData, "name");
  if (!name || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/suppliers"), { status: 303 });

  if (mode === "create") {
    const supplier = await prisma.supplier.create({ data: supplierData(formData, name) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Supplier", entityId: supplier.id, description: `Tạo nhà cung cấp ${supplier.name}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/suppliers"), { status: 303 });
    const supplier = await prisma.supplier.update({ where: { id }, data: supplierData(formData, name) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Supplier", entityId: supplier.id, description: `Cập nhật nhà cung cấp ${supplier.name}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/suppliers"), { status: 303 });
}

function supplierData(formData: FormData, name: string) {
  return {
    name,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    address: text(formData, "address") || null,
    taxCode: text(formData, "taxCode") || null,
    note: text(formData, "note") || null,
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
