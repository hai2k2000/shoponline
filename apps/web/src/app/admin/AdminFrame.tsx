"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminUser = { name: string; email: string; role: string } | null;

const links = [
  ["Dashboard", "/admin/dashboard"],
  ["Sản phẩm", "/admin/products"],
  ["Danh mục", "/admin/categories"],
  ["Kho hàng", "/admin/inventory"],
  ["Nhập hàng", "/admin/purchases"],
  ["Đơn hàng", "/admin/orders"],
  ["Vận chuyển", "/admin/shipments"],
  ["Khách hàng", "/admin/customers"],
  ["Nhà cung cấp", "/admin/suppliers"],
  ["Thanh toán", "/admin/finance/payments"],
  ["Chi phí", "/admin/finance/expenses"],
  ["Công nợ", "/admin/finance/debts"],
  ["Báo cáo", "/admin/reports"],
  ["Automation", "/admin/automation"],
  ["Người dùng", "/admin/users"],
  ["Cài đặt", "/admin/settings"],
];

export function AdminFrame({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <Link href="/admin/dashboard" className="block">
            <span className="block text-lg font-semibold">ShopOnline</span>
            <span className="text-xs font-semibold text-emerald-700">Admin</span>
          </Link>
          <Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold lg:mt-4 lg:block lg:text-center" href="/admin/logout">Đăng xuất</Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:grid lg:overflow-visible">
          {links.map(([label, href]) => {
            const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        {user ? <div className="hidden border-t border-slate-100 px-4 py-4 text-sm lg:block"><strong>{user.name}</strong><p className="mt-1 text-xs text-slate-500">{user.email}</p><p className="mt-1 text-xs font-semibold text-emerald-700">{viRole(user.role)}</p></div> : null}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function viRole(role: string) {
  return ({ ADMIN: "Quản trị", MANAGER: "Quản lý", SALES: "Bán hàng", WAREHOUSE: "Kho", ACCOUNTANT: "Kế toán", MARKETING: "Marketing" } as Record<string, string>)[role] || role;
}
