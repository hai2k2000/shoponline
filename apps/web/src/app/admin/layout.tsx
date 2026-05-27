import { getCurrentUser } from "@/lib/auth";
import { AdminFrame } from "./AdminFrame";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <AdminFrame user={user ? { name: user.name, email: user.email, role: user.role } : null}>{children}</AdminFrame>;
}
