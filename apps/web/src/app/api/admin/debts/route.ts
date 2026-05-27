import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type DebtType = "CUSTOMER" | "SUPPLIER";
type DebtStatus = "OPEN" | "PARTIAL" | "PAID" | "OVERDUE" | "CLOSED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function parseDate(value: string) { return value ? new Date(`${value}T00:00:00.000Z`) : null; }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }
function resolveStatus(amount: number, paidAmount: number, requested?: string): DebtStatus {
  if (requested === "CLOSED") return "CLOSED";
  if (paidAmount <= 0) return "OPEN";
  if (paidAmount >= amount) return "PAID";
  return "PARTIAL";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/finance/debts"), { status: 303 });
  const mode = text(formData, "mode");
  if (!["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });

  if (mode === "create") {
    const type = text(formData, "type") as DebtType;
    const amount = money(formData, "amount");
    const paidAmount = Math.min(amount, money(formData, "paidAmount"));
    const customerId = text(formData, "customerId");
    const supplierId = text(formData, "supplierId");
    if (!["CUSTOMER", "SUPPLIER"].includes(type) || amount <= 0) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
    if (type === "CUSTOMER" && !customerId) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
    if (type === "SUPPLIER" && !supplierId) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
    const debt = await prisma.debt.create({
      data: {
        type,
        amount,
        paidAmount,
        status: resolveStatus(amount, paidAmount),
        dueDate: parseDate(text(formData, "dueDate")),
        note: text(formData, "note") || null,
        customerId: type === "CUSTOMER" ? customerId : null,
        supplierId: type === "SUPPLIER" ? supplierId : null,
      },
    });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Debt", entityId: debt.id, description: `Tạo công nợ ${type} ${amount}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    const amount = money(formData, "amount");
    const paidAmount = Math.min(amount, money(formData, "paidAmount"));
    if (!id || amount <= 0) return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
    const debt = await prisma.debt.update({
      where: { id },
      data: {
        amount,
        paidAmount,
        status: resolveStatus(amount, paidAmount, text(formData, "status")),
        dueDate: parseDate(text(formData, "dueDate")),
        note: text(formData, "note") || null,
      },
    });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Debt", entityId: debt.id, description: `Cập nhật công nợ ${debt.id}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/finance/debts"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
