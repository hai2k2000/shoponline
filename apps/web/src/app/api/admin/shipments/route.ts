import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySessionToken } from "@/lib/auth";

type ShipmentStatus = "PENDING" | "PACKED" | "SHIPPED" | "DELIVERED" | "FAILED" | "RETURNED";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function money(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

function nullableDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(raw) : null;
}

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/shipments"), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/shipments"), { status: 303 });
  const orderId = text(formData, "orderId");
  const carrier = text(formData, "carrier");
  if (!orderId || !carrier) return back(request);

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Không tìm thấy đơn hàng.");
    if (["CANCELLED", "RETURNED"].includes(order.orderStatus)) throw new Error("Không thể tạo vận đơn cho đơn đã hủy hoặc trả hàng.");

    const shipment = await tx.shipment.create({
      data: {
        orderId,
        carrier,
        service: text(formData, "service") || null,
        trackingCode: text(formData, "trackingCode") || null,
        shippingFee: money(formData, "shippingFee"),
        status: (text(formData, "status") as ShipmentStatus) || "PENDING",
        shippedAt: nullableDate(formData.get("shippedAt")),
        deliveredAt: nullableDate(formData.get("deliveredAt")),
        note: text(formData, "note") || null,
        createdById: user.id,
      },
    });

    if (shipment.status === "SHIPPED" && !["COMPLETED", "CANCELLED", "RETURNED"].includes(order.orderStatus)) {
      await tx.order.update({ where: { id: orderId }, data: { orderStatus: "SHIPPING" } });
    }
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_SHIPMENT", entityType: "Shipment", entityId: shipment.id, description: `Tạo vận đơn cho ${order.orderCode}` } });
  });

  return back(request);
}

function publicUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  return new URL(path, `${proto}://${host}`);
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
