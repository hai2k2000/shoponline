import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const adminLinks = [
  ["Sản phẩm", "/admin/products"],
  ["Danh mục", "/admin/categories"],
  ["Kho hàng", "/admin/inventory"],
  ["Đơn hàng", "/admin/orders"],
  ["Khách hàng", "/admin/customers"],
  ["Nhà cung cấp", "/admin/suppliers"],
  ["Chi phí", "/admin/finance/expenses"],
  ["Công nợ", "/admin/finance/debts"],
  ["Báo cáo", "/admin/reports"],
  ["Người dùng", "/admin/users"],
  ["Cài đặt", "/admin/settings"],
];

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [productCount, categoryCount, customerCount, supplierCount, orderCount, todayOrders, monthOrders, completedRevenue, monthExpenses, debts, lowStock, recentOrders] = await Promise.all([
    prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.category.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.customer.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.supplier.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({ where: { orderStatus: "COMPLETED" }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { status: "ACTIVE", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.debt.findMany({ where: { status: { in: ["OPEN", "PARTIAL", "OVERDUE"] } }, select: { type: true, amount: true, paidAmount: true } }),
    prisma.inventory.findMany({ where: { product: { status: { not: "ARCHIVED" } } }, include: { product: { select: { name: true, sku: true, minStock: true } } } }),
    prisma.order.findMany({ orderBy: { updatedAt: "desc" }, take: 6, include: { customer: { select: { name: true } }, items: { select: { productName: true, quantity: true } } } }),
  ]);

  const receivable = debts.filter((debt) => debt.type === "CUSTOMER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const payable = debts.filter((debt) => debt.type === "SUPPLIER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const lowStockRows = lowStock.filter((row) => row.quantity - row.reservedQuantity <= row.product.minStock);
  const revenue = Number(completedRevenue._sum.total || 0);
  const expenses = Number(monthExpenses._sum.amount || 0);
  const estimatedProfit = revenue - expenses;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">ShopOnline Admin</p>
            <h1 className="text-3xl font-semibold">Dashboard điều hành</h1>
            <p className="mt-1 text-sm text-slate-600">{user.name} - {viRole(user.role)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" href="/">Ra website</Link>
            <Link className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/admin/logout">Đăng xuất</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Doanh thu hoàn tất" value={money(revenue)} tone="emerald" />
          <Metric label="Lợi nhuận ước tính" value={money(estimatedProfit)} tone={estimatedProfit >= 0 ? "emerald" : "red"} />
          <Metric label="Đơn hôm nay" value={todayOrders} />
          <Metric label="Đơn trong tháng" value={monthOrders} />
          <Metric label="Phải thu" value={money(receivable)} />
          <Metric label="Phải trả" value={money(payable)} />
          <Metric label="Tồn thấp" value={lowStockRows.length} tone={lowStockRows.length ? "amber" : "emerald"} />
          <Metric label="Chi phí tháng" value={money(expenses)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold">Đơn hàng gần đây</h2>
              <Link className="text-sm font-semibold text-emerald-700" href="/admin/orders">Xem tất cả</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Tổng</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
                <tbody>{recentOrders.map((order) => <tr key={order.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{order.orderCode}</td><td className="px-4 py-3">{order.customer?.name || "Khách lẻ"}</td><td className="px-4 py-3">{order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}</td><td className="px-4 py-3">{money(Number(order.total))}</td><td className="px-4 py-3">{viOrderStatus(order.orderStatus)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Tổng quan dữ liệu</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Mini label="Sản phẩm" value={productCount} />
                <Mini label="Danh mục" value={categoryCount} />
                <Mini label="Khách hàng" value={customerCount} />
                <Mini label="Nhà cung cấp" value={supplierCount} />
                <Mini label="Tổng đơn" value={orderCount} />
                <Mini label="Tồn thấp" value={lowStockRows.length} />
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Điều hướng nhanh</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{adminLinks.map(([label, href]) => <Link key={href} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={href}>{label}</Link>)}</div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "emerald" | "amber" | "red" }) {
  const colors = { slate: "text-slate-950", emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className={`mt-2 block text-2xl ${colors[tone]}`}>{value}</strong></article>;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-slate-50 p-3"><span className="text-slate-500">{label}</span><strong className="mt-1 block text-lg">{value}</strong></div>;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function viRole(role: string) {
  return ({ ADMIN: "Quản trị", MANAGER: "Quản lý", SALES: "Bán hàng", WAREHOUSE: "Kho", ACCOUNTANT: "Kế toán", MARKETING: "Marketing" } as Record<string, string>)[role] || role;
}

function viOrderStatus(status: string) {
  return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status;
}
