import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const adminLinks = [
  ["S?n ph?m", "/admin/products"],
  ["Danh m?c", "/admin/categories"],
  ["Kho", "/admin/inventory"],
  ["??n h?ng", "/admin/orders"],
  ["Kh?ch h?ng", "/admin/customers"],
  ["Nhà cung cấp", "/admin/suppliers"],
  ["Chi ph?", "/admin/finance/expenses"],
  ["C?ng n?", "/admin/finance/debts"],
  ["B?o c?o", "/admin/reports"],
  ["Ng??i d?ng", "/admin/users"],
  ["C?i ??t", "/admin/settings"],
];

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [products, categories, orders, customers, expenses] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  const cards = [
    ["S?n ph?m", products],
    ["Danh m?c", categories],
    ["??n h?ng", orders],
    ["Kh?ch h?ng", customers],
    ["Chi ph?", Number(expenses._sum.amount || 0).toLocaleString("vi-VN")],
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin</p>
            <h1 className="text-3xl font-semibold">Dashboard ?i?u h?nh</h1>
            <p className="mt-1 text-sm text-slate-600">{user.name} ? {user.role}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" href="/">Ra website</Link>
            <Link className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/admin/logout">??ng xu?t</Link>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-5">
          {cards.map(([label, value]) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-sm text-slate-500">{label}</span>
              <strong className="mt-2 block text-2xl">{value}</strong>
            </article>
          ))}
        </section>
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
          {adminLinks.map(([label, href]) => (
            <Link key={href} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50" href={href}>{label}</Link>
          ))}
        </section>
      </div>
    </main>
  );
}
