import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function money(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/finance/payments"), { status: 303 });
  const orderId = text(formData, "orderId");
  const amount = money(formData, "amount");
  if (!orderId || amount <= 0) return NextResponse.redirect(publicUrl(request, "/admin/finance/payments"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new Error("Không thể thu tiền đơn đã hủy hoặc trả hàng.");
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const remaining = Math.max(0, Number(order.total) - paid);
    if (amount > remaining) throw new Error("Số tiền thu vượt quá số còn lại.");

    const payment = await tx.paymentTransaction.create({
      data: {
        orderId,
        amount,
        method: text(formData, "method") || "CASH",
        reference: text(formData, "reference") || null,
        note: text(formData, "note") || null,
        receivedById: user.id,
      },
    });

    const nextPaid = paid + amount;
    const paymentStatus = nextPaid >= Number(order.total) ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus } });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_PAYMENT", entityType: "PaymentTransaction", entityId: payment.id, description: `Thu ${amount} cho đơn ${order.orderCode}` } });
  });

  return NextResponse.redirect(publicUrl(request, "/admin/finance/payments"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
