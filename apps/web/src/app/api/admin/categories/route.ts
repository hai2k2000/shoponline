import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function numberValue(formData: FormData, key: string) { return Number(formData.get(key) || 0) || 0; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""); }
function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/categories"), { status: 303 });
  const mode = text(formData, "mode");
  const name = text(formData, "name");
  if (!name || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/categories"), { status: 303 });

  if (mode === "create") {
    const slug = await uniqueSlug(name, text(formData, "slug"));
    const category = await prisma.category.create({ data: categoryData(formData, name, slug) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Category", entityId: category.id, description: `Tạo danh mục ${category.name}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/categories"), { status: 303 });
    const slug = await uniqueSlug(name, text(formData, "slug"), id);
    const category = await prisma.category.update({ where: { id }, data: categoryData(formData, name, slug, id) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Category", entityId: category.id, description: `Cập nhật danh mục ${category.name}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/categories"), { status: 303 });
}

async function uniqueSlug(name: string, preferredSlug: string, ignoreId?: string) {
  const base = slugify(preferredSlug || name) || `danh-muc-${Date.now()}`;
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

function categoryData(formData: FormData, name: string, slug: string, id?: string) {
  const parentId = text(formData, "parentId") || null;
  return {
    name,
    slug,
    parentId: parentId === id ? null : parentId,
    description: text(formData, "description") || null,
    sortOrder: numberValue(formData, "sortOrder"),
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
