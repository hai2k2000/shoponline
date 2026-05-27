import type { Prisma, RecordStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  note: string | null;
  status: RecordStatus;
};

export async function createExpense(tx: Prisma.TransactionClient, input: ExpenseInput, userId: string) {
  const expense = await tx.expense.create({ data: input });
  await tx.activityLog.create({ data: { userId, action: "CREATE", entityType: "Expense", entityId: expense.id, description: `Tạo chi phí ${expense.title}` } });
  return expense;
}

export async function updateExpense(tx: Prisma.TransactionClient, id: string, input: ExpenseInput, userId: string) {
  const expense = await tx.expense.update({ where: { id }, data: input });
  await tx.activityLog.create({ data: { userId, action: "UPDATE", entityType: "Expense", entityId: expense.id, description: `Cập nhật chi phí ${expense.title}` } });
  return expense;
}

export async function archiveExpense(tx: Prisma.TransactionClient, id: string, userId: string) {
  const expense = await tx.expense.findUnique({ where: { id } });
  if (!expense) throw new AdminFormError("NOT_FOUND", "Không tìm thấy chi phí.");
  const archived = await tx.expense.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId, action: "ARCHIVE", entityType: "Expense", entityId: archived.id, description: `Lưu trữ chi phí ${archived.title}` } });
  return archived;
}
