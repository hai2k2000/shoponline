import type { Prisma, RecordStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type CustomerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  source: string | null;
  group: string | null;
  notes: string | null;
  status: RecordStatus;
};

export async function createCustomer(tx: Prisma.TransactionClient, input: CustomerInput, userId: string) {
  const customer = await tx.customer.create({ data: input });
  await tx.activityLog.create({ data: { userId, action: "CREATE", entityType: "Customer", entityId: customer.id, description: `Tạo khách hàng ${customer.name}` } });
  return customer;
}

export async function updateCustomer(tx: Prisma.TransactionClient, id: string, input: CustomerInput, userId: string) {
  const customer = await tx.customer.update({ where: { id }, data: input });
  await tx.activityLog.create({ data: { userId, action: "UPDATE", entityType: "Customer", entityId: customer.id, description: `Cập nhật khách hàng ${customer.name}` } });
  return customer;
}

export async function archiveCustomer(tx: Prisma.TransactionClient, id: string, userId: string) {
  const customer = await tx.customer.findUnique({ where: { id } });
  if (!customer) throw new AdminFormError("NOT_FOUND", "Không tìm thấy khách hàng.");
  const archived = await tx.customer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId, action: "ARCHIVE", entityType: "Customer", entityId: archived.id, description: `Lưu trữ khách hàng ${archived.name}` } });
  return archived;
}
