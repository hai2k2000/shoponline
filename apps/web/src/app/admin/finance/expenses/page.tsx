import { prisma } from "@/lib/prisma";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const rows = await prisma.expense.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return (
    <ExpensesClient
      rows={rows.map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        amount: Number(row.amount),
        note: row.note,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
