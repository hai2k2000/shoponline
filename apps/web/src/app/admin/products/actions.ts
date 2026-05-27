"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function moneyValue(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(/,/g, "")) || 0;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
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

export async function createProductAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const sku = await uniqueSku(String(formData.get("sku") || ""));
  const slug = await uniqueSlug(name, String(formData.get("slug") || ""));
  const initialStock = Number(formData.get("stockQuantity") || 0) || 0;
  const product = await prisma.product.create({
    data: {
      name,
      slug,
      sku,
      categoryId: String(formData.get("categoryId") || "") || null,
      shortDescription: String(formData.get("shortDescription") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      costPrice: moneyValue(formData.get("costPrice")),
      salePrice: moneyValue(formData.get("salePrice")),
      promotionPrice: String(formData.get("promotionPrice") || "") ? moneyValue(formData.get("promotionPrice")) : null,
      thumbnail: String(formData.get("thumbnail") || "").trim() || null,
      status: String(formData.get("status") || "DRAFT") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED",
      minStock: Number(formData.get("minStock") || 0) || 0,
      inventory: { create: { quantity: initialStock, reservedQuantity: 0 } },
      transactions: initialStock > 0 ? { create: { type: "IMPORT", quantity: initialStock, beforeQuantity: 0, afterQuantity: initialStock, note: "Tồn kho khởi tạo khi tạo sản phẩm" } } : undefined,
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Product", entityId: product.id, description: `Tạo sản phẩm ${product.name}` } });
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}

export async function updateProductAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;
  const sku = await uniqueSku(String(formData.get("sku") || ""), id);
  const slug = await uniqueSlug(name, String(formData.get("slug") || ""), id);
  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      sku,
      categoryId: String(formData.get("categoryId") || "") || null,
      shortDescription: String(formData.get("shortDescription") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      costPrice: moneyValue(formData.get("costPrice")),
      salePrice: moneyValue(formData.get("salePrice")),
      promotionPrice: String(formData.get("promotionPrice") || "") ? moneyValue(formData.get("promotionPrice")) : null,
      thumbnail: String(formData.get("thumbnail") || "").trim() || null,
      status: String(formData.get("status") || "DRAFT") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED",
      minStock: Number(formData.get("minStock") || 0) || 0,
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Product", entityId: product.id, description: `Cập nhật sản phẩm ${product.name}` } });
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}

export async function archiveProductAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const product = await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "ARCHIVE", entityType: "Product", entityId: product.id, description: `Lưu trữ sản phẩm ${product.name}` } });
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}
