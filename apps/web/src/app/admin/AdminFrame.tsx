"use client";

import type { ComponentType, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Boxes, ClipboardList, LayoutDashboard, LogOut, Package, ReceiptText, Settings, ShieldCheck, Truck, Users, WalletCards } from "lucide-react";

type AdminUser = { name: string; email: string; role: string } | null;
type NavItem = { label: string; href: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { label: "Tổng quan", items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] },
  {
    label: "Bán hàng",
    items: [
      { label: "Đơn hàng", href: "/admin/orders", icon: ClipboardList },
      { label: "Vận chuyển", href: "/admin/shipments", icon: Truck },
      { label: "Trả hàng", href: "/admin/returns", icon: ReceiptText },
      { label: "Khuyến mãi", href: "/admin/promotions", icon: WalletCards },
    ],
  },
  {
    label: "Kho và hàng hóa",
    items: [
      { label: "Sản phẩm", href: "/admin/products", icon: Package },
      { label: "Danh mục", href: "/admin/categories", icon: Boxes },
      { label: "Kho hàng", href: "/admin/inventory", icon: Boxes },
      { label: "Nhập hàng", href: "/admin/purchases", icon: ReceiptText },
    ],
  },
  {
    label: "Quan hệ",
    items: [
      { label: "Khách hàng", href: "/admin/customers", icon: Users },
      { label: "CSKH", href: "/admin/customers/timeline", icon: Bell },
      { label: "Nhà cung cấp", href: "/admin/suppliers", icon: Truck },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { label: "Thanh toán", href: "/admin/finance/payments", icon: WalletCards },
      { label: "Chi phí", href: "/admin/finance/expenses", icon: ReceiptText },
      { label: "Công nợ", href: "/admin/finance/debts", icon: BarChart3 },
      { label: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Nhật ký", href: "/admin/audit", icon: ShieldCheck },
      { label: "Thông báo", href: "/admin/notifications", icon: Bell },
      { label: "Automation", href: "/admin/automation", icon: Settings },
      { label: "System", href: "/admin/system", icon: ShieldCheck },
      { label: "Người dùng", href: "/admin/users", icon: Users },
      { label: "Cài đặt", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminFrame({ user, children }: { user: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block">
          <a href="/admin/dashboard" className="block rounded-lg outline-none focus:ring-2 focus:ring-slate-300">
            <span className="block text-lg font-semibold">ShopOnline</span>
            <span className="text-xs font-semibold text-emerald-700">Business Hub</span>
          </a>
          <a className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold lg:mt-4 lg:w-full lg:justify-center" href="/admin/logout"><LogOut className="size-4" />Đăng xuất</a>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:grid lg:flex-1 lg:content-start lg:gap-4 lg:overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="flex gap-2 lg:grid lg:gap-1">
              <p className="hidden px-2 text-xs font-semibold uppercase text-slate-400 lg:block">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(`${item.href}/`));
                return (
                  <a key={item.href} href={item.href} className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                    <Icon className="size-4" />
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {user ? <div className="hidden border-t border-slate-100 px-4 py-4 text-sm lg:block"><strong>{user.name}</strong><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p><p className="mt-1 text-xs font-semibold text-emerald-700">{viRole(user.role)}</p></div> : null}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function viRole(role: string) {
  return ({ ADMIN: "Quản trị", MANAGER: "Quản lý", SALES: "Bán hàng", WAREHOUSE: "Kho", ACCOUNTANT: "Kế toán", MARKETING: "Marketing" } as Record<string, string>)[role] || role;
}
