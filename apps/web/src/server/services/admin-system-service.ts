import bcrypt from "bcryptjs";
import type { Prisma, RecordStatus, UserRole } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export async function markNotificationRead(tx: Prisma.TransactionClient, id: string) {
  return tx.notification.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(tx: Prisma.TransactionClient) {
  return tx.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
}

export async function createCustomerTimeline(tx: Prisma.TransactionClient, input: { customerId: string; type: "NOTE" | "CALL" | "MESSAGE" | "ORDER" | "SUPPORT"; title: string; note: string | null }, userId: string) {
  return tx.customerTimeline.create({ data: { ...input, createdById: userId } });
}

export async function updateStoreSetting(tx: Prisma.TransactionClient, input: { storeName: string; logo: string | null; phone: string | null; email: string | null; address: string | null; shippingFee: number; inventoryStrategy: string }, userId: string) {
  const setting = await tx.storeSetting.upsert({ where: { id: "default" }, create: { id: "default", ...input }, update: input });
  await tx.activityLog.create({ data: { userId, action: "UPDATE", entityType: "StoreSetting", entityId: setting.id, description: "Cập nhật cấu hình cửa hàng" } });
  return setting;
}

export type UserInput = { name: string; email: string; role: UserRole; status: RecordStatus; password?: string };

export async function upsertAdminUser(tx: Prisma.TransactionClient, mode: "create" | "update", input: UserInput, adminId: string, id?: string | null) {
  if (mode === "update" && !id) throw new AdminFormError("VALIDATION_ERROR", "Thiếu người dùng cần cập nhật.");
  if (mode === "create") {
    if (!input.password || input.password.length < 6) throw new AdminFormError("VALIDATION_ERROR", "Mật khẩu tối thiểu 6 ký tự.");
    const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 10), role: input.role, status: input.status } });
    await tx.activityLog.create({ data: { userId: adminId, action: "CREATE", entityType: "User", entityId: user.id, description: `Tạo người dùng ${user.email}` } });
    return user;
  }
  const user = await tx.user.update({ where: { id: id! }, data: { name: input.name, email: input.email, role: input.role, status: input.status } });
  await tx.activityLog.create({ data: { userId: adminId, action: "UPDATE", entityType: "User", entityId: user.id, description: `Cập nhật người dùng ${user.email}` } });
  return user;
}

export async function archiveAdminUser(tx: Prisma.TransactionClient, id: string, adminId: string) {
  if (id === adminId) throw new AdminFormError("BUSINESS_RULE_ERROR", "Không thể lưu trữ chính tài khoản đang đăng nhập.");
  const user = await tx.user.update({ where: { id }, data: { status: "ARCHIVED" } });
  await tx.activityLog.create({ data: { userId: adminId, action: "ARCHIVE", entityType: "User", entityId: user.id, description: `Lưu trữ người dùng ${user.email}` } });
  return user;
}

export async function resetAdminUserPassword(tx: Prisma.TransactionClient, id: string, password: string, adminId: string) {
  if (password.length < 6) throw new AdminFormError("VALIDATION_ERROR", "Mật khẩu tối thiểu 6 ký tự.");
  const user = await tx.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await tx.activityLog.create({ data: { userId: adminId, action: "RESET_PASSWORD", entityType: "User", entityId: user.id, description: `Reset mật khẩu ${user.email}` } });
  return user;
}
