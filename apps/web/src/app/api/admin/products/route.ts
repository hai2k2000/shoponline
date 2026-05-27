import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(String(formData.get(key) || "0").replace(/,/g, "")) || 0); }
function numberValue(formData: FormData, key: string) { return Math.max(0, Math.floor(Number(formData.get(key) || 0) || 0)); }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""); }
function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "DRAFT";
}
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/products"), { status: 303 });
  const mode = text(formData, "mode");
  const name = text(formData, "name");
  if (!name || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/products"), { status: 303 });

  if (mode === "create") {
    const sku = await uniqueSku(text(formData, "sku"));
    const slug = await uniqueSlug(name, text(formData, "slug"));
    const initialStock = numberValue(formData, "stockQuantity");
    const product = await prisma.product.create({
      data: {
        ...productData(formData, name, slug, sku),
        inventory: { create: { quantity: initialStock, reservedQuantity: 0 } },
        transactions: initialStock > 0 ? { create: { type: "IMPORT", quantity: initialStock, beforeQuantity: 0, afterQuantity: initialStock, note: "Tồn kho khởi tạo khi tạo sản phẩm" } } : undefined,
      },
    });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Product", entityId: product.id, description: `Tạo sản phẩm ${product.name}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/products"), { status: 303 });
    const sku = await uniqueSku(text(formData, "sku"), id);
    const slug = await uniqueSlug(name, text(formData, "slug"), id);
    const product = await prisma.product.update({ where: { id }, data: productData(formData, name, slug, sku) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Product", entityId: product.id, description: `Cập nhật sản phẩm ${product.name}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/products"), { status: 303 });
}

async function uniqueSlug(name: string, preferredSlug: string, ignoreId?: string) {
  const base = slugify(preferredSlug || name) || `san-pham-${Date.now()}`;
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

async function uniqueSku(preferredSku: string, ignoreId?: string) {
  const base = (preferredSku || `SKU-${Date.now()}`).trim().toUpperCase().replace(/\s+/g, "-");
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

function productData(formData: FormData, name: string, slug: string, sku: string) {
  return {
    name,
    slug,
    sku,
    categoryId: text(formData, "categoryId") || null,
    shortDescription: text(formData, "shortDescription") || null,
    description: text(formData, "description") || null,
    costPrice: money(formData, "costPrice"),
    salePrice: money(formData, "salePrice"),
    promotionPrice: text(formData, "promotionPrice") ? money(formData, "promotionPrice") : null,
    thumbnail: text(formData, "thumbnail") || null,
    status: status(formData),
    minStock: numberValue(formData, "minStock"),
  };
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
