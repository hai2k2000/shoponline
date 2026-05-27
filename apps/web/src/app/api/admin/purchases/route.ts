import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifySessionToken } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string) {
  return Math.max(0, Number(formData.get(key) || 0) || 0);
}

function purchaseCode() {
  const now = new Date();
  return `PO${now.toISOString().slice(0, 10).replaceAll("-", "")}${now.getTime().toString().slice(-6)}`;
}

function nullableDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(raw) : null;
}

function back(request: NextRequest) {
  return NextResponse.redirect(publicUrl(request, "/admin/purchases"), { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentUserFromForm(formData);
  if (!user) return NextResponse.redirect(publicUrl(request, "/admin/login?next=/admin/purchases"), { status: 303 });
  const productId = text(formData, "productId");
  const quantity = Math.max(1, Math.floor(numberValue(formData, "quantity")));
  if (!productId || quantity <= 0) return back(request);

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || product.status === "ARCHIVED") throw new Error("Sản phẩm không hợp lệ.");
    const costPrice = numberValue(formData, "costPrice") || Number(product.costPrice);
    const subtotal = costPrice * quantity;
    const shippingFee = numberValue(formData, "shippingFee");
    const purchase = await tx.purchaseOrder.create({
      data: {
        code: purchaseCode(),
        supplierId: text(formData, "supplierId") || null,
        status: "ORDERED",
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        expectedAt: nullableDate(formData.get("expectedAt")),
        note: text(formData, "note") || null,
        items: {
          create: [{ productId, productName: product.name, sku: product.sku, quantity, costPrice, total: subtotal }],
        },
      },
    });
    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE_PURCHASE_ORDER", entityType: "PurchaseOrder", entityId: purchase.id, description: `Tạo đơn nhập ${purchase.code}` } });
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
