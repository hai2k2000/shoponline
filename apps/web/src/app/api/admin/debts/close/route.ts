import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/finance/debts"), { status: 303 });
  const id = text(formData, "id");
  if (!id) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
  const debt = await prisma.debt.update({ where: { id }, data: { status: "CLOSED" } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "CLOSE", entityType: "Debt", entityId: debt.id, description: `Đóng công nợ ${debt.id}` } });
  return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
