"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}

export async function createSupplierAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (!name) return;

  const supplier = await prisma.supplier.create({
    data: {
      name,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      taxCode: text(formData, "taxCode") || null,
      note: text(formData, "note") || null,
      status: status(formData),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier.id,
      description: `Tạo nhà cung cấp ${supplier.name}`,
    },
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/dashboard");
}

export async function updateSupplierAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      taxCode: text(formData, "taxCode") || null,
      note: text(formData, "note") || null,
      status: status(formData),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      entityType: "Supplier",
      entityId: supplier.id,
      description: `Cập nhật nhà cung cấp ${supplier.name}`,
    },
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/dashboard");
}

export async function archiveSupplierAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  if (!id) return;

  const supplier = await prisma.supplier.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "ARCHIVE",
      entityType: "Supplier",
      entityId: supplier.id,
      description: `Lưu trữ nhà cung cấp ${supplier.name}`,
    },
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/dashboard");
}
