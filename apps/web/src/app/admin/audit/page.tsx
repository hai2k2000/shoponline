import { prisma } from "@/lib/prisma";
import { AuditClient } from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <AuditClient
      rows={rows.map((row) => ({
        id: row.id,
        user: row.user?.name || row.user?.email || null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
