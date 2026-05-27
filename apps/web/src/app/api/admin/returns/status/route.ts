import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type ReturnStatus = "APPROVED" | "RECEIVED" | "REFUNDED" | "REJECTED";

function text(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function publicUrl(request: NextRequest, path: string) { const proto = request.headers.get("x-forwarded-proto") || "https"; const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host; return new URL(path, `${proto}://${host}`); }

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/returns"), { status: 303 });
  const id = text(formData, "id");
  const status = text(formData, "status") as ReturnStatus;
  if (!id || !["APPROVED", "RECEIVED", "REFUNDED", "REJECTED"].includes(status)) return NextResponse.redirect(publicUrl(request, "/admin/returns"), { status: 303 });

  await prisma.$transaction(async (tx) => {
    const row = await tx.returnRequest.findUnique({ where: { id }, include: { order: { include: { items: true } }, refunds: true } });
    if (!row) throw new Error("Không tìm thấy yêu cầu trả hàng.");
    if (["REFUNDED", "REJECTED"].includes(row.status)) return;
    if (status === "APPROVED" && row.status !== "REQUESTED") return;
    if (status === "RECEIVED" && row.status !== "APPROVED") return;
    if (status === "REFUNDED" && row.status !== "RECEIVED") return;

    if (status === "RECEIVED" && row.order.orderStatus === "COMPLETED") {
      for (const item of row.order.items) {
        if (!item.productId) continue;
        const inventory = await tx.inventory.upsert({ where: { productId: item.productId }, update: {}, create: { productId: item.productId, quantity: 0, reservedQuantity: 0 } });
        const afterQuantity = inventory.quantity + item.quantity;
        await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: afterQuantity } });
        await tx.inventoryTransaction.create({ data: { productId: item.productId, type: "RETURN", quantity: item.quantity, beforeQuantity: inventory.quantity, afterQuantity, note: `Hoàn kho ${row.code}` } });
      }
    }

    if (status === "REFUNDED") {
      const alreadyRefunded = row.refunds.reduce((sum, item) => sum + Number(item.amount), 0);
      const amount = Math.max(0, Number(row.refundAmount) - alreadyRefunded);
      if (amount > 0) await tx.refundTransaction.create({ data: { returnRequestId: row.id, orderId: row.orderId, amount, method: "BANK_TRANSFER", note: `Hoàn tiền ${row.code}`, refundedById: user.id } });
      await tx.order.update({ where: { id: row.orderId }, data: { orderStatus: "RETURNED", paymentStatus: "REFUNDED" } });
      if (row.order.customerId) {
        await tx.customerTimeline.create({ data: { customerId: row.order.customerId, type: "SUPPORT", title: `Hoàn tiền ${row.code}`, note: `Đã hoàn ${amount}`, createdById: user.id } });
      }
    }

    await tx.returnRequest.update({ where: { id }, data: { status, receivedAt: status === "RECEIVED" ? new Date() : row.receivedAt, refundedAt: status === "REFUNDED" ? new Date() : row.refundedAt } });
    await tx.activityLog.create({ data: { userId: user.id, action: "UPDATE_RETURN_STATUS", entityType: "ReturnRequest", entityId: id, description: `Đổi trạng thái ${row.code} sang ${status}` } });
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
