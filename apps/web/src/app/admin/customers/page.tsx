import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { CustomersClient } from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const cookieStore = await cookies();
  const params = await searchParams;
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.customer.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return <CustomersClient sessionToken={sessionToken} initialQuery={params.search || ""} rows={rows.map((row) => ({ id: row.id, name: row.name, phone: row.phone, email: row.email, address: row.address, source: row.source, group: row.group, notes: row.notes, status: row.status, totalOrders: row.totalOrders, totalSpent: Number(row.totalSpent), updatedAt: row.updatedAt.toISOString() }))} />;
}
