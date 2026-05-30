import type { Prisma, RecordStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function uniqueCategorySlug(tx: Prisma.TransactionClient, name: string, preferredSlug: string | null, ignoreId?: string) {
  const base = slugify(preferredSlug || name) || `danh-muc-${Date.now()}`;
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await tx.category.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

async function uniqueProductSlug(tx: Prisma.TransactionClient, name: string, preferredSlug: string | null, ignoreId?: string) {
  const base = slugify(preferredSlug || name) || `san-pham-${Date.now()}`;
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

async function uniqueSku(tx: Prisma.TransactionClient, preferredSku: string | null, ignoreId?: string) {
  const base = (preferredSku || `SKU-${Date.now()}`).trim().toUpperCase().replace(/\s+/g, "-");
  let candidate = base;
  let index = 2;
  while (true) {
    const existing = await tx.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${index++}`;
  }
}

export type CategoryInput = {
  name: string;
  slug: string | null;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  status: RecordStatus;
};

export async function upsertCategory(tx: Prisma.TransactionClient, mode: "create" | "update", input: CategoryInput, userId: string, id?: string | null) {
  if (mode === "update" && !id) throw new AdminFormError("VALIDATION_ERROR", "Thiếu danh mục cần cập nhật.");
  const slug = await uniqueCategorySlug(tx, input.name, input.slug, id || undefined);
  const data = { name: input.name, slug, parentId: input.parentId === id ? null : input.parentId, description: input.description, sortOrder: input.sortOrder, status: input.status };
  const category = mode === "create" ? await tx.category.create({ data }) : await tx.category.update({ where: { id: id! }, data });
  await tx.activityLog.create({ data: { userId, action: mode === "create" ? "CREATE" : "UPDATE", entityType: "Category", entityId: category.id, description: `${mode === "create" ? "Tạo" : "Cập nhật"} danh mục ${category.name}` } });
  return category;
}

export async function archiveCategory(tx: Prisma.TransactionClient, id: string, userId: string) {
  const current = await tx.category.findUnique({ where: { id } });
  if (!current) throw new AdminFormError("NOT_FOUND", "Không tìm thấy danh mục.");
  const category = await tx.category.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId, action: "ARCHIVE", entityType: "Category", entityId: category.id, description: `Lưu trữ danh mục ${category.name}` } });
  return category;
}

export type ProductInput = {
  name: string;
  slug: string | null;
  sku: string | null;
  categoryId: string | null;
  shortDescription: string | null;
  description: string | null;
  costPrice: number;
  salePrice: number;
  promotionPrice: number | null;
  thumbnail: string | null;
  status: RecordStatus;
  minStock: number;
  stockQuantity: number;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string | null;
};

export async function upsertProduct(tx: Prisma.TransactionClient, mode: "create" | "update", input: ProductInput, userId: string, id?: string | null) {
  if (mode === "update" && !id) throw new AdminFormError("VALIDATION_ERROR", "Thiếu sản phẩm cần cập nhật.");
  const sku = await uniqueSku(tx, input.sku, id || undefined);
  const slug = await uniqueProductSlug(tx, input.name, input.slug, id || undefined);
  const data = {
    name: input.name,
    slug,
    sku,
    categoryId: input.categoryId,
    shortDescription: input.shortDescription,
    description: input.description,
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    promotionPrice: input.promotionPrice,
    thumbnail: input.thumbnail,
    status: input.status,
    minStock: input.minStock,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    tags: input.tags,
  };
  const product = mode === "create"
    ? await tx.product.create({
        data: {
          ...data,
          inventory: { create: { quantity: input.stockQuantity, reservedQuantity: 0 } },
          transactions: input.stockQuantity > 0 ? { create: { type: "IMPORT", quantity: input.stockQuantity, beforeQuantity: 0, afterQuantity: input.stockQuantity, note: "Tồn kho khởi tạo khi tạo sản phẩm" } } : undefined,
        },
      })
    : await tx.product.update({ where: { id: id! }, data });
  await tx.activityLog.create({ data: { userId, action: mode === "create" ? "CREATE" : "UPDATE", entityType: "Product", entityId: product.id, description: `${mode === "create" ? "Tạo" : "Cập nhật"} sản phẩm ${product.name}` } });
  return product;
}

export async function archiveProduct(tx: Prisma.TransactionClient, id: string, userId: string) {
  const current = await tx.product.findUnique({ where: { id } });
  if (!current) throw new AdminFormError("NOT_FOUND", "Không tìm thấy sản phẩm.");
  const product = await tx.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId, action: "ARCHIVE", entityType: "Product", entityId: product.id, description: `Lưu trữ sản phẩm ${product.name}` } });
  return product;
}
