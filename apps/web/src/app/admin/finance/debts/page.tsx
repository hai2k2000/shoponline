import { prisma } from "@/lib/prisma";
import { DebtsClient } from "./DebtsClient";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const [rows, customers, suppliers] = await Promise.all([
    prisma.debt.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.customer.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.supplier.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);

  return (
    <DebtsClient
      rows={rows.map((row) => ({
        id: row.id,
        type: row.type,
        partyName: row.customer?.name || row.supplier?.name || "Chưa gắn đối tượng",
        amount: Number(row.amount),
        paidAmount: Number(row.paidAmount),
        status: row.status,
        dueDate: row.dueDate?.toISOString() || null,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      }))}
      customers={customers}
      suppliers={suppliers}
    />
  );
}
