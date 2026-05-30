import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { SuppliersClient } from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.supplier.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      debts: {
        select: {
          amount: true,
          paidAmount: true,
          status: true,
        },
      },
      purchases: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          code: true,
          status: true,
          total: true,
          expectedAt: true,
          receivedAt: true,
          updatedAt: true,
          items: { select: { quantity: true } },
        },
      },
    },
  });

  return (
    <SuppliersClient
      sessionToken={sessionToken}
      initialQuery={params.search || ""}
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        taxCode: row.taxCode,
        note: row.note,
        status: row.status,
        debtCount: row.debts.length,
        openDebt: row.debts.reduce((sum, debt) => sum + (debt.status === "OPEN" ? Number(debt.amount) - Number(debt.paidAmount) : 0), 0),
        purchases: row.purchases.map((purchase) => ({
          id: purchase.id,
          code: purchase.code,
          status: purchase.status,
          total: Number(purchase.total),
          expectedAt: purchase.expectedAt?.toISOString() || null,
          receivedAt: purchase.receivedAt?.toISOString() || null,
          updatedAt: purchase.updatedAt.toISOString(),
          itemQuantity: purchase.items.reduce((sum, item) => sum + item.quantity, 0),
        })),
      }))}
    />
  );
}
