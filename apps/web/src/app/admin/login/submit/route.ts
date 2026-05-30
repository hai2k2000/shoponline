import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const ADMIN_EMAIL = "admin@shoponline.local";
const FALLBACK_REDIRECT = "/admin/dashboard";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

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

function originForRequest(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

function loginUrl(request: NextRequest, next: string, error: string) {
  const url = new URL("/admin/login", originForRequest(request));
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const identifier = String(formData.get("identifier") || formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeRedirectPath(formData.get("next"));

  if (!identifier || !password) return NextResponse.redirect(loginUrl(request, next, "missing"), 303);

  const email = emailForIdentifier(identifier);
  if (!email) return NextResponse.redirect(loginUrl(request, next, "invalid"), 303);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return NextResponse.redirect(loginUrl(request, next, "locked"), 303);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return NextResponse.redirect(loginUrl(request, next, "invalid"), 303);

  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, description: "Đăng nhập quản trị" },
  });

  const response = NextResponse.redirect(new URL(next, originForRequest(request)), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken({ userId: user.id, email: user.email, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}
