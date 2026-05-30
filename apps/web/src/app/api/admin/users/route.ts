import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminFormError } from "@/lib/admin-form";
import { redirectTo, redirectWithAdminError, requireAdminFormUser } from "@/lib/admin-api";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { user: admin, response } = await requireAdminFormUser(request, formData, "users:write", "/admin/users");
    if (!admin) return response;

    const mode = String(formData.get("mode") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const roleVal = String(formData.get("role") || "SALES").trim();
    const statusVal = String(formData.get("status") || "ACTIVE").trim();

    const validRoles = ["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"];
    const validStatuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
    const safeRole = validRoles.includes(roleVal) ? roleVal : "SALES";
    const safeStatus = validStatuses.includes(statusVal) ? statusVal : "ACTIVE";

    if (!name || !email) throw new AdminFormError("VALIDATION_ERROR", "Thiếu tên hoặc email.");
    if (!["create", "update"].includes(mode)) throw new AdminFormError("VALIDATION_ERROR", "Thao tác không hợp lệ.");

    if (mode === "create") {
      const password = String(formData.get("password") || "").trim();
      if (password.length < 6) throw new AdminFormError("VALIDATION_ERROR", "Mật khẩu phải có ít nhất 6 ký tự.");
      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) throw new AdminFormError("VALIDATION_ERROR", "Email đã tồn tại.");
      const user = await prisma.user.create({
        data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: safeRole as never, status: safeStatus as never },
      });
      await prisma.activityLog.create({ data: { userId: admin.id, action: "CREATE", entityType: "User", entityId: user.id, description: `Tạo người dùng ${user.email}` } });
    }

    if (mode === "update") {
      const id = String(formData.get("id") || "").trim();
      if (!id) throw new AdminFormError("VALIDATION_ERROR", "Thiếu ID người dùng.");
      const user = await prisma.user.update({
        where: { id },
        data: { name, email, role: safeRole as never, status: safeStatus as never },
      });
      await prisma.activityLog.create({ data: { userId: admin.id, action: "UPDATE", entityType: "User", entityId: user.id, description: `Cập nhật người dùng ${user.email}` } });
    }

    return redirectTo(request, "/admin/users");
  } catch (error) {
    return redirectWithAdminError(request, "/admin/users", error);
  }
}
