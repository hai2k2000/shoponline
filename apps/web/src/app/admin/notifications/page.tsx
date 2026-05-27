import { prisma } from "@/lib/prisma";
import { NotificationsClient } from "./NotificationsClient";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const rows = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <NotificationsClient
      sessionToken={sessionToken}
      rows={rows.map((row) => ({
        id: row.id,
        level: row.level,
        title: row.title,
        message: row.message,
        entityType: row.entityType,
        entityId: row.entityId,
        readAt: row.readAt?.toISOString() || null,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}
