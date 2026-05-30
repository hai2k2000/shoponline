"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

const ADMIN_EMAIL = "admin@shoponline.local";
const FALLBACK_REDIRECT = "/admin/dashboard";

function emailForIdentifier(identifier: string) {
  if (identifier.includes("@")) return identifier;
  if (identifier === "admin") return ADMIN_EMAIL;
  return "";
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  const next = String(value || "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return FALLBACK_REDIRECT;
  if (next === "/admin/login" || next.startsWith("/admin/login?")) return FALLBACK_REDIRECT;
  return next;
}

export async function loginAction(_prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
  const identifier = String(formData.get("identifier") || formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!identifier || !password) return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };

  const email = emailForIdentifier(identifier);
  if (!email) return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return { error: "Tài khoản không tồn tại hoặc đã bị khóa." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, description: "Đăng nhập quản trị" },
  });
  redirect(safeRedirectPath(formData.get("next")));
}
