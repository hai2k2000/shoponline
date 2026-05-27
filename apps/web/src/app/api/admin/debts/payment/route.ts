import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }
function resolveStatus(amount: number, paidAmount: number) { if (paidAmount <= 0) return "OPEN"; if (paidAmount >= amount) return "PAID"; return "PARTIAL"; }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/finance/debts"), { status: 303 });
  const id = text(formData, "id");
  const payment = money(formData, "payment");
  if (!id || payment <= 0) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
  await prisma.$transaction(async (tx) => {
    const current = await tx.debt.findUnique({ where: { id } });
    if (!current) throw new Error("Không tìm thấy công nợ.");
    const amount = Number(current.amount);
    const paidAmount = Math.min(amount, Number(current.paidAmount) + payment);
    await tx.debt.update({ where: { id }, data: { paidAmount, status: resolveStatus(amount, paidAmount) } });
    await tx.activityLog.create({ data: { userId: user.id, action: "PAY_DEBT", entityType: "Debt", entityId: id, description: `Ghi nhận thanh toán công nợ ${payment}` } });
  });
  return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
