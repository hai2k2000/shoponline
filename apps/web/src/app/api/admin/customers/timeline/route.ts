import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/customers/timeline"), { status: 303 });
  const customerId = text(formData, "customerId");
  const title = text(formData, "title");
  const type = text(formData, "type") || "NOTE";
  if (!customerId || !title) return NextResponse.redirect(publicUrl(request, "/admin/customers/timeline"), { status: 303 });
  await prisma.customerTimeline.create({
    data: {
      customerId,
      type: ["NOTE", "CALL", "MESSAGE", "ORDER", "SUPPORT"].includes(type) ? type as "NOTE" : "NOTE",
      title,
      note: text(formData, "note") || null,
      createdById: user.id,
    },
  });
  return NextResponse.redirect(publicUrl(request, "/admin/customers/timeline"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
}
