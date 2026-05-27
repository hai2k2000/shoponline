"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type DebtType = "CUSTOMER" | "SUPPLIER";
type DebtStatus = "OPEN" | "PARTIAL" | "PAID" | "OVERDUE" | "CLOSED";

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

function parseDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function resolveStatus(amount: number, paidAmount: number, requested?: string): DebtStatus {
  if (requested === "CLOSED") return "CLOSED";
  if (paidAmount <= 0) return "OPEN";
  if (paidAmount >= amount) return "PAID";
  return "PARTIAL";
}

export async function createDebtAction(formData: FormData) {
  const user = await requireUser();
  const type = text(formData, "type") as DebtType;
  const amount = money(formData, "amount");
  const paidAmount = Math.min(amount, money(formData, "paidAmount"));
  const customerId = text(formData, "customerId");
  const supplierId = text(formData, "supplierId");
  if (!["CUSTOMER", "SUPPLIER"].includes(type) || amount <= 0) return;
  if (type === "CUSTOMER" && !customerId) return;
  if (type === "SUPPLIER" && !supplierId) return;

  const debt = await prisma.debt.create({
    data: {
      type,
      amount,
      paidAmount,
      status: resolveStatus(amount, paidAmount),
      dueDate: parseDate(text(formData, "dueDate")),
      note: text(formData, "note") || null,
      customerId: type === "CUSTOMER" ? customerId : null,
      supplierId: type === "SUPPLIER" ? supplierId : null,
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Debt", entityId: debt.id, description: `Tạo công nợ ${type} ${amount}` } });
  revalidateFinance();
}

export async function updateDebtAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const amount = money(formData, "amount");
  const paidAmount = Math.min(amount, money(formData, "paidAmount"));
  if (!id || amount <= 0) return;

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      amount,
      paidAmount,
      status: resolveStatus(amount, paidAmount, text(formData, "status")),
      dueDate: parseDate(text(formData, "dueDate")),
      note: text(formData, "note") || null,
    },
  });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Debt", entityId: debt.id, description: `Cập nhật công nợ ${debt.id}` } });
  revalidateFinance();
}

export async function recordDebtPaymentAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  const payment = money(formData, "payment");
  if (!id || payment <= 0) return;

  const debt = await prisma.$transaction(async (tx) => {
    const current = await tx.debt.findUnique({ where: { id } });
    if (!current) throw new Error("Không tìm thấy công nợ.");
    const amount = Number(current.amount);
    const paidAmount = Math.min(amount, Number(current.paidAmount) + payment);
    const updated = await tx.debt.update({ where: { id }, data: { paidAmount, status: resolveStatus(amount, paidAmount) } });
    await tx.activityLog.create({ data: { userId: user.id, action: "PAY_DEBT", entityType: "Debt", entityId: id, description: `Ghi nhận thanh toán công nợ ${payment}` } });
    return updated;
  });
  if (!debt) return;
  revalidateFinance();
}

export async function closeDebtAction(formData: FormData) {
  const user = await requireUser();
  const id = text(formData, "id");
  if (!id) return;
  const debt = await prisma.debt.update({ where: { id }, data: { status: "CLOSED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CLOSE", entityType: "Debt", entityId: debt.id, description: `Đóng công nợ ${debt.id}` } });
  revalidateFinance();
}

function revalidateFinance() {
  revalidatePath("/admin/finance/debts");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
}
