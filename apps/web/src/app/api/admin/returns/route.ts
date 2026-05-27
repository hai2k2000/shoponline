import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function money(formData: FormData, key: string) { return Math.max(0, Number(formData.get(key) || 0) || 0); }
function returnCode() { const now = new Date(); return `RT${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`; }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/returns"), { status: 303 });
  const orderId = text(formData, "orderId");
  if (!orderId) return NextResponse.redirect(publicUrl(request, "/admin/returns"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (!["COMPLETED", "SHIPPING"].includes(order.orderStatus)) throw new Error("Chỉ tạo trả hàng cho đơn đã giao hoặc đang giao.");
    const paid = order.payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const refundAmount = Math.min(money(formData, "refundAmount"), paid || Number(order.total));
    const request = await tx.returnRequest.create({
      data: {
        code: returnCode(),
        orderId,
        reason: text(formData, "reason") || "Khác",
        refundAmount,
        note: text(formData, "note") || null,
        createdById: user.id,
      },
    });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_RETURN_REQUEST", entityType: "ReturnRequest", entityId: request.id, description: `Tạo yêu cầu trả hàng ${request.code}` } });
    await tx.notification.create({ data: { userId: user.id, level: "WARNING", title: `Yêu cầu trả hàng ${request.code}`, message: `Đơn ${order.orderCode} cần xử lý trả hàng.`, entityType: "ReturnRequest", entityId: request.id } });
  });

  return NextResponse.redirect(publicUrl(request, "/admin/returns"), { status: 303 });
}

async function getCurrentUserFromForm(formData: FormData) {
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  const session = verifySessionToken(text(formData, "sessionToken"));
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, status: true } });
}
