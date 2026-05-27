import type { DebtStatus, DebtType, Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type DebtCreateInput = {
  type: DebtType;
  amount: number;
  paidAmount: number;
  dueDate: Date | null;
  note: string | null;
  customerId: string | null;
  supplierId: string | null;
};

export type DebtUpdateInput = {
  id: string;
  amount: number;
  paidAmount: number;
  status?: DebtStatus;
  dueDate: Date | null;
  note: string | null;
};

function resolveStatus(amount: number, paidAmount: number, requested?: DebtStatus): DebtStatus {
  if (requested === "CLOSED") return "CLOSED";
  if (paidAmount <= 0) return "OPEN";
  if (paidAmount >= amount) return "PAID";
  return "PARTIAL";
}

export async function createDebt(tx: Prisma.TransactionClient, input: DebtCreateInput, userId: string) {
  if (input.type === "CUSTOMER" && !input.customerId) throw new AdminFormError("VALIDATION_ERROR", "Cần chọn khách hàng.");
  if (input.type === "SUPPLIER" && !input.supplierId) throw new AdminFormError("VALIDATION_ERROR", "Cần chọn nhà cung cấp.");
  const paidAmount = Math.min(input.amount, input.paidAmount);
  const debt = await tx.debt.create({
    data: {
      type: input.type,
      amount: input.amount,
      paidAmount,
      status: resolveStatus(input.amount, paidAmount),
      dueDate: input.dueDate,
      note: input.note,
      customerId: input.type === "CUSTOMER" ? input.customerId : null,
      supplierId: input.type === "SUPPLIER" ? input.supplierId : null,
    },
  });
  await tx.activityLog.create({ data: { userId, action: "CREATE", entityType: "Debt", entityId: debt.id, description: `Tạo công nợ ${input.type} ${input.amount}` } });
  return debt;
}

export async function updateDebt(tx: Prisma.TransactionClient, input: DebtUpdateInput, userId: string) {
  const paidAmount = Math.min(input.amount, input.paidAmount);
  const debt = await tx.debt.update({
    where: { id: input.id },
    data: { amount: input.amount, paidAmount, status: resolveStatus(input.amount, paidAmount, input.status), dueDate: input.dueDate, note: input.note },
  });
  await tx.activityLog.create({ data: { userId, action: "UPDATE", entityType: "Debt", entityId: debt.id, description: `Cập nhật công nợ ${debt.id}` } });
  return debt;
}

export async function recordDebtPayment(tx: Prisma.TransactionClient, id: string, payment: number, userId: string) {
  const current = await tx.debt.findUnique({ where: { id } });
  if (!current) throw new AdminFormError("NOT_FOUND", "Không tìm thấy công nợ.");
  const amount = Number(current.amount);
  const paidAmount = Math.min(amount, Number(current.paidAmount) + payment);
  const debt = await tx.debt.update({ where: { id }, data: { paidAmount, status: resolveStatus(amount, paidAmount) } });
  await tx.activityLog.create({ data: { userId, action: "PAY_DEBT", entityType: "Debt", entityId: id, description: `Ghi nhận thanh toán công nợ ${payment}` } });
  return debt;
}

export async function closeDebt(tx: Prisma.TransactionClient, id: string, userId: string) {
  const current = await tx.debt.findUnique({ where: { id } });
  if (!current) throw new AdminFormError("NOT_FOUND", "Không tìm thấy công nợ.");
  const debt = await tx.debt.update({ where: { id }, data: { status: "CLOSED" } });
  await tx.activityLog.create({ data: { userId, action: "CLOSE", entityType: "Debt", entityId: debt.id, description: `Đóng công nợ ${debt.id}` } });
  return debt;
}
