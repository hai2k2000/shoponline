import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.expense.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return (
    <ExpensesClient
      sessionToken={sessionToken}
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
