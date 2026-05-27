import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";
import { AdminFormError } from "@/lib/admin-form";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export type AdminPermission =
  | "categories:write"
  | "products:write"
  | "inventory:write"
  | "orders:write"
  | "customers:write"
  | "suppliers:write"
  | "finance:write"
  | "users:write"
  | "settings:write"
  | "shipments:write"
  | "purchases:write"
  | "returns:write"
  | "promotions:write"
  | "notifications:write";

const permissionRoles: Record<AdminPermission, string[]> = {
  "categories:write": ["ADMIN", "MANAGER", "WAREHOUSE"],
  "products:write": ["ADMIN", "MANAGER", "WAREHOUSE"],
  "inventory:write": ["ADMIN", "MANAGER", "WAREHOUSE"],
  "orders:write": ["ADMIN", "MANAGER", "SALES"],
  "customers:write": ["ADMIN", "MANAGER", "SALES"],
  "suppliers:write": ["ADMIN", "MANAGER", "WAREHOUSE", "ACCOUNTANT"],
  "finance:write": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "users:write": ["ADMIN", "MANAGER"],
  "settings:write": ["ADMIN", "MANAGER"],
  "shipments:write": ["ADMIN", "MANAGER", "SALES", "WAREHOUSE"],
  "purchases:write": ["ADMIN", "MANAGER", "WAREHOUSE"],
  "returns:write": ["ADMIN", "MANAGER", "SALES", "ACCOUNTANT", "WAREHOUSE"],
  "promotions:write": ["ADMIN", "MANAGER", "MARKETING"],
  "notifications:write": ["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"],
};

export function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
}

export function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(publicUrl(request, path), { status: 303 });
}

export function redirectWithAdminError(request: NextRequest, path: string, error: unknown) {
  const url = publicUrl(request, path);
  if (error instanceof AdminFormError) {
    url.searchParams.set("error", error.code);
    url.searchParams.set("message", error.message);
  } else {
    url.searchParams.set("error", "SERVER_ERROR");
    url.searchParams.set("message", "Không thể xử lý yêu cầu.");
    console.error(error);
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function getAdminUserFromForm(formData: FormData): Promise<AdminUser | null> {
  const cookieUser = await getCurrentUser();
  if (cookieUser?.status === "ACTIVE") return cookieUser;

  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;

  return prisma.user.findFirst({
    where: { id: session.userId, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}

export function hasPermission(user: AdminUser, permission: AdminPermission) {
  return permissionRoles[permission].includes(user.role);
}

export async function requireAdminFormUser(
  request: NextRequest,
  formData: FormData,
  permission: AdminPermission,
  loginNext: string,
) {
  const user = await getAdminUserFromForm(formData);
  if (!user) return { user: null, response: redirectTo(request, `/admin/login?next=${loginNext}`) };
  if (!hasPermission(user, permission)) return { user: null, response: redirectTo(request, loginNext) };
  return { user, response: null };
}
