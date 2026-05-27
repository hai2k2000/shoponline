"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type UserRole = "ADMIN" | "MANAGER" | "SALES" | "WAREHOUSE" | "ACCOUNTANT" | "MARKETING";
type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!["ADMIN", "MANAGER"].includes(user.role)) throw new Error("Không có quyền quản lý người dùng.");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function role(formData: FormData): UserRole {
  const value = text(formData, "role");
  return ["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"].includes(value) ? (value as UserRole) : "SALES";
}

function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (!name || !email || password.length < 6) return;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role(formData),
      status: status(formData),
    },
  });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id, description: `Tạo người dùng ${user.email}` } });
  revalidateUsers();
}

export async function updateUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  if (!id || !name || !email) return;

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role: role(formData), status: status(formData) },
  });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "UPDATE", entityType: "User", entityId: user.id, description: `Cập nhật người dùng ${user.email}` } });
  revalidateUsers();
}

export async function resetUserPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const password = text(formData, "password");
  if (!id || password.length < 6) return;
  const user = await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "RESET_PASSWORD", entityType: "User", entityId: user.id, description: `Reset mật khẩu ${user.email}` } });
  revalidateUsers();
}

export async function archiveUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  if (!id || id === admin.id) return;
  const user = await prisma.user.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "ARCHIVE", entityType: "User", entityId: user.id, description: `Lưu trữ người dùng ${user.email}` } });
  revalidateUsers();
}

function revalidateUsers() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
}
