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

function money(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}

export async function createExpenseAction(formData: FormData) {
  const user = await requireUser();
  const title = text(formData, "title");
  const amount = money(formData, "amount");
  if (!title || amount <= 0) return;

  const expense = await prisma.expense.create({
    data: {
      title,
      amount,
      category: text(formData, "category") || "Khác",
      note: text(formData, "note") || null,
      status: status(formData),
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id, description: `Tạo chi phí ${expense.title}` } });
  revalidateFinance();
}

export async function updateExpenseAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const title = text(formData, "title");
  const amount = money(formData, "amount");
  if (!id || !title || amount <= 0) return;

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      title,
      amount,
      category: text(formData, "category") || "Khác",
      note: text(formData, "note") || null,
      status: status(formData),
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Expense", entityId: expense.id, description: `Cập nhật chi phí ${expense.title}` } });
  revalidateFinance();
}

export async function archiveExpenseAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  if (!id) return;
  const expense = await prisma.expense.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "ARCHIVE", entityType: "Expense", entityId: expense.id, description: `Lưu trữ chi phí ${expense.title}` } });
  revalidateFinance();
}

function revalidateFinance() {
  revalidatePath("/admin/finance/expenses");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
}
