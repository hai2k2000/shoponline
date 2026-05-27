import type { Prisma, RecordStatus } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type SupplierInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  note: string | null;
  status: RecordStatus;
};

export async function createSupplier(tx: Prisma.TransactionClient, input: SupplierInput, userId: string) {
  const supplier = await tx.supplier.create({ data: input });
  await tx.activityLog.create({ data: { userId, action: "CREATE", entityType: "Supplier", entityId: supplier.id, description: `Tạo nhà cung cấp ${supplier.name}` } });
  return supplier;
}

export async function updateSupplier(tx: Prisma.TransactionClient, id: string, input: SupplierInput, userId: string) {
  const supplier = await tx.supplier.update({ where: { id }, data: input });
  await tx.activityLog.create({ data: { userId, action: "UPDATE", entityType: "Supplier", entityId: supplier.id, description: `Cập nhật nhà cung cấp ${supplier.name}` } });
  return supplier;
}

export async function archiveSupplier(tx: Prisma.TransactionClient, id: string, userId: string) {
  const supplier = await tx.supplier.findUnique({ where: { id } });
  if (!supplier) throw new AdminFormError("NOT_FOUND", "Không tìm thấy nhà cung cấp.");
  const archived = await tx.supplier.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId, action: "ARCHIVE", entityType: "Supplier", entityId: archived.id, description: `Lưu trữ nhà cung cấp ${archived.name}` } });
  return archived;
}
