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

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  const name = text(formData, "name");
  if (!name) return;
  const customer = await prisma.customer.create({
    data: {
      name,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      source: text(formData, "source") || null,
      group: text(formData, "group") || null,
      notes: text(formData, "notes") || null,
      status: text(formData, "status") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED" || "ACTIVE",
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Customer", entityId: customer.id, description: `Tạo khách hàng ${customer.name}` } });
  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
}

export async function updateCustomerAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      source: text(formData, "source") || null,
      group: text(formData, "group") || null,
      notes: text(formData, "notes") || null,
      status: text(formData, "status") as "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED" || "ACTIVE",
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Customer", entityId: customer.id, description: `Cập nhật khách hàng ${customer.name}` } });
  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
}

export async function archiveCustomerAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  if (!id) return;
  const customer = await prisma.customer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "ARCHIVE", entityType: "Customer", entityId: customer.id, description: `Lưu trữ khách hàng ${customer.name}` } });
  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
}
