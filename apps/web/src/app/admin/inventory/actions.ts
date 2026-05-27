"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

function numberValue(value: FormDataEntryValue | null) {
  return Math.max(0, Number(value || 0) || 0);
}

async function ensureInventory(productId: string) {
  const existing = await prisma.inventory.findUnique({ where: { productId } });
  if (existing) return existing;
  return prisma.inventory.create({ data: { productId, quantity: 0, reservedQuantity: 0 } });
}

export async function importStockAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  const quantity = numberValue(formData.get("quantity"));
  const note = String(formData.get("note") || "").trim() || null;
  if (!productId || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.upsert({ where: { productId }, update: {}, create: { productId, quantity: 0, reservedQuantity: 0 } });
    const afterQuantity = inventory.quantity + quantity;
    await tx.inventory.update({ where: { productId }, data: { quantity: afterQuantity } });
    await tx.inventoryTransaction.create({ data: { productId, type: "IMPORT", quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId: user.id, action: "IMPORT_STOCK", entityType: "Product", entityId: productId, description: `Nhập kho ${quantity}` } });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}

export async function exportStockAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  const quantity = numberValue(formData.get("quantity"));
  const note = String(formData.get("note") || "").trim() || null;
  if (!productId || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.upsert({ where: { productId }, update: {}, create: { productId, quantity: 0, reservedQuantity: 0 } });
    const available = inventory.quantity - inventory.reservedQuantity;
    if (quantity > available) throw new Error("Không đủ tồn khả dụng để xuất kho.");
    const afterQuantity = inventory.quantity - quantity;
    await tx.inventory.update({ where: { productId }, data: { quantity: afterQuantity } });
    await tx.inventoryTransaction.create({ data: { productId, type: "EXPORT", quantity, beforeQuantity: inventory.quantity, afterQuantity, note } });
    await tx.activityLog.create({ data: { userId: user.id, action: "EXPORT_STOCK", entityType: "Product", entityId: productId, description: `Xuất kho ${quantity}` } });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}

export async function adjustStockAction(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  const actualQuantity = numberValue(formData.get("actualQuantity"));
  const note = String(formData.get("note") || "").trim() || "Điều chỉnh tồn kho";
  if (!productId) return;

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.upsert({ where: { productId }, update: {}, create: { productId, quantity: 0, reservedQuantity: 0 } });
    if (actualQuantity < inventory.reservedQuantity) throw new Error("Tồn thực tế không được nhỏ hơn số lượng đang giữ.");
    const delta = Math.abs(actualQuantity - inventory.quantity);
    await tx.inventory.update({ where: { productId }, data: { quantity: actualQuantity } });
    await tx.inventoryTransaction.create({ data: { productId, type: "ADJUST", quantity: delta, beforeQuantity: inventory.quantity, afterQuantity: actualQuantity, note } });
    await tx.activityLog.create({ data: { userId: user.id, action: "ADJUST_STOCK", entityType: "Product", entityId: productId, description: `Điều chỉnh tồn từ ${inventory.quantity} thành ${actualQuantity}` } });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
}
