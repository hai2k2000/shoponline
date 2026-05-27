import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { PromotionsClient } from "./PromotionsClient";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.promotion.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <PromotionsClient
      sessionToken={sessionToken}
      rows={rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        discountType: row.discountType,
        discountValue: Number(row.discountValue),
        minOrder: Number(row.minOrder),
        maxDiscount: row.maxDiscount == null ? null : Number(row.maxDiscount),
        usageLimit: row.usageLimit,
        usedCount: row.usedCount,
        status: row.status,
        startsAt: row.startsAt?.toISOString() || null,
        endsAt: row.endsAt?.toISOString() || null,
      }))}
    />
  );
}
