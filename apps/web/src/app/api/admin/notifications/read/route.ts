import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function back(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return NextResponse.redirect(new URL("/admin/notifications", `${proto}://${host}`), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return back(request);
  const id = String(formData.get("id") || "").trim();
  if (id) await prisma.notification.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
  return back(request);
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const token = String(formData.get("sessionToken") || "").trim();
  const session = verifySessionToken(token);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}
