import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/admin/login", "/admin/login/submit", "/admin/logout", "/api/health", "/favicon.ico"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname.startsWith("/api/")) return false;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    if (pathname === "/") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname === "/" ? "/admin/dashboard" : pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
