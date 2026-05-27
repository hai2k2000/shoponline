"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

export async function loginAction(_prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Vui l?ng nh?p email v? m?t kh?u." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return { error: "T?i kho?n kh?ng t?n t?i ho?c ?? b? kho?." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Email ho?c m?t kh?u kh?ng ??ng." };

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, description: "??ng nh?p qu?n tr?" },
  });
  redirect("/admin/dashboard");
}
