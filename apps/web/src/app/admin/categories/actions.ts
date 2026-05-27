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

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
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

export async function createCategoryAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const slug = await uniqueSlug(name, String(formData.get("slug") || ""));
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      parentId: String(formData.get("parentId") || "") || null,
      description: String(formData.get("description") || "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") || 0),
      status: String(formData.get("status") || "ACTIVE") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED",
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Category", entityId: category.id, description: `T?o danh m?c ${category.name}` } });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/dashboard");
}

export async function updateCategoryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;
  const slug = await uniqueSlug(name, String(formData.get("slug") || ""), id);
  const parentId = String(formData.get("parentId") || "") || null;
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      parentId: parentId === id ? null : parentId,
      description: String(formData.get("description") || "").trim() || null,
      sortOrder: Number(formData.get("sortOrder") || 0),
      status: String(formData.get("status") || "ACTIVE") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED",
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Category", entityId: category.id, description: `C?p nh?t danh m?c ${category.name}` } });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/dashboard");
}

export async function archiveCategoryAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const category = await prisma.category.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "ARCHIVE", entityType: "Category", entityId: category.id, description: `L?u tr? danh m?c ${category.name}` } });
  revalidatePath("/admin/categories");
  revalidatePath("/admin/dashboard");
}
