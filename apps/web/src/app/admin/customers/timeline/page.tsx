import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { CustomerTimelineClient } from "./CustomerTimelineClient";

export const dynamic = "force-dynamic";

export default async function CustomerTimelinePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const [rows, customers] = await Promise.all([
    prisma.customerTimeline.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.customer.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);

  return (
    <CustomerTimelineClient
      sessionToken={sessionToken}
      customers={customers}
      rows={rows.map((row) => ({
        id: row.id,
        customer: row.customer.name,
        type: row.type,
        title: row.title,
        note: row.note,
        createdBy: row.createdBy?.name || null,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
