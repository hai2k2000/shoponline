import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value || "";
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin/login");
  if (!["ADMIN", "MANAGER"].includes(currentUser.role)) redirect("/admin/dashboard");
  const rows = await prisma.user.findMany({ orderBy: [{ updatedAt: "desc" }] });
  return (
    <UsersClient
      sessionToken={sessionToken}
      currentUserId={currentUser.id}
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }))}
    />
  );
}
