import type { DiscountType, Prisma } from "@prisma/client";
import { AdminFormError } from "@/lib/admin-form";

export type PromotionInput = {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  endsAt: Date | null;
};

export async function createPromotion(tx: Prisma.TransactionClient, input: PromotionInput) {
  return tx.promotion.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount,
      usageLimit: input.usageLimit,
      endsAt: input.endsAt,
      status: "ACTIVE",
    },
  });
}

export async function togglePromotion(tx: Prisma.TransactionClient, id: string) {
  const promotion = await tx.promotion.findUnique({ where: { id } });
  if (!promotion) throw new AdminFormError("NOT_FOUND", "Không tìm thấy mã khuyến mãi.");
  return tx.promotion.update({ where: { id }, data: { status: promotion.status === "ACTIVE" ? "HIDDEN" : "ACTIVE" } });
}
