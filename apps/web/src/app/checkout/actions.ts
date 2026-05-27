"use server";

import { prisma } from "@/lib/prisma";
import { CheckoutError, createPublicCheckoutOrder, type CheckoutCartItem } from "@/server/services/checkout-service";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function checkoutAction(formData: FormData) {
  try {
    const rawCart = text(formData, "cart");
    const items = JSON.parse(rawCart || "[]") as CheckoutCartItem[];
    const result = await prisma.$transaction((tx) => createPublicCheckoutOrder(tx, {
      items,
      customerName: text(formData, "name"),
      phone: text(formData, "phone"),
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      note: text(formData, "note") || null,
      couponCode: text(formData, "couponCode") || null,
    }));
    return { ok: true, orderCode: result.orderCode };
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false, error: error.message };
    if (error instanceof SyntaxError) return { ok: false, error: "Giỏ hàng không hợp lệ." };
    console.error(error);
    return { ok: false, error: "Không thể đặt hàng." };
  }
}
