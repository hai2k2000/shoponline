import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type RecordStatus = "ACTIVE" | "DRAFT" | "HIDDEN" | "ARCHIVED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function status(formData: FormData): RecordStatus {
  const value = text(formData, "status");
  return ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"].includes(value) ? (value as RecordStatus) : "ACTIVE";
}
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/finance/expenses"), { status: 303 });
  const mode = text(formData, "mode");
  const title = text(formData, "title");
  const amount = money(formData, "amount");
  if (!title || amount <= 0 || !["create", "update"].includes(mode)) return NextResponse.redirect(publicUrl(request, "/admin/finance/expenses"), { status: 303 });

  if (mode === "create") {
    const expense = await prisma.expense.create({ data: expenseData(formData, title, amount) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entityType: "Expense", entityId: expense.id, description: `Tạo chi phí ${expense.title}` } });
  }

  if (mode === "update") {
    const id = text(formData, "id");
    if (!id) return NextResponse.redirect(publicUrl(request, "/admin/finance/expenses"), { status: 303 });
    const expense = await prisma.expense.update({ where: { id }, data: expenseData(formData, title, amount) });
    await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entityType: "Expense", entityId: expense.id, description: `Cập nhật chi phí ${expense.title}` } });
  }

  return NextResponse.redirect(publicUrl(request, "/admin/finance/expenses"), { status: 303 });
}

function expenseData(formData: FormData, title: string, amount: number) {
  return {
    title,
    amount,
    category: text(formData, "category") || "Khác",
    note: text(formData, "note") || null,
    status: status(formData),
  };
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
