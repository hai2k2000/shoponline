"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function loginAction(_prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return { error: "Tài khoản không tồn tại hoặc đã bị khóa." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Email hoặc mật khẩu không đúng." };

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, description: "Đăng nhập quản trị" },
  });
  redirect("/admin/dashboard");
}
