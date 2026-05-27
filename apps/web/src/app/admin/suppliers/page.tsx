import { prisma } from "@/lib/prisma";
import { SuppliersClient } from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
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
    },
  });

  return (
    <SuppliersClient
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
      }))}
    />
  );
}
