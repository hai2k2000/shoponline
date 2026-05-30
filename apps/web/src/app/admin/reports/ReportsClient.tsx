"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { AdminPage, DataPanel, EmptyState, PageHeader, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";

type Summary = { revenue: number; expenses: number; profit: number; orders: number; completedOrders: number; receivable: number; payable: number; inventoryValue: number };
type SalesRow = { orderCode: string; customer: string; status: string; total: number; createdAt: string };
type InventoryRow = { product: string; sku: string; quantity: number; reservedQuantity: number; available: number; value: number; minStock: number };
type DebtRow = { type: string; party: string; amount: number; paidAmount: number; remaining: number; status: string };
type ProductSalesRow = { product: string; sku: string; quantity: number; revenue: number; profit: number };
type ReportTab = "sales" | "products" | "inventory" | "debts";

const tabs: Array<{ id: ReportTab; label: string }> = [
  { id: "sales", label: "Bán hàng" },
  { id: "products", label: "Sản phẩm" },
  { id: "inventory", label: "Tồn kho" },
  { id: "debts", label: "Công nợ" },
];

export function ReportsClient({ summary, salesRows, inventoryRows, debtRows, productSalesRows }: { summary: Summary; salesRows: SalesRow[]; inventoryRows: InventoryRow[]; debtRows: DebtRow[]; productSalesRows: ProductSalesRow[] }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const completionRate = summary.orders ? Math.round((summary.completedOrders / summary.orders) * 100) : 0;
  const lowStockCount = inventoryRows.filter((row) => row.available <= row.minStock).length;
  const openDebtCount = debtRows.filter((row) => row.remaining > 0 && !["PAID", "CLOSED"].includes(row.status)).length;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Tài chính / Báo cáo"
        title="Báo cáo vận hành"
        description="Tổng hợp bán hàng, tồn kho, công nợ và lợi nhuận ước tính từ dữ liệu đang chạy."
        action={<a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50" href={`/api/admin/reports/export?tab=${activeTab}`}><Download className="mr-2 size-4" />CSV</a>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu" value={money(summary.revenue)} tone="emerald" hint={`${summary.completedOrders} đơn hoàn tất`} />
        <StatCard label="Chi phí" value={money(summary.expenses)} tone={summary.expenses ? "amber" : "slate"} hint="Chi phí đang ACTIVE" />
        <StatCard label="Lợi nhuận ước tính" value={money(summary.profit)} tone={summary.profit >= 0 ? "emerald" : "red"} hint={`Tỷ lệ hoàn tất ${completionRate}%`} />
        <StatCard label="Giá trị tồn kho" value={money(summary.inventoryValue)} tone="blue" hint={`${lowStockCount} mã cần chú ý`} />
        <StatCard label="Tổng đơn" value={summary.orders} hint="Tất cả trạng thái" />
        <StatCard label="Đơn hoàn tất" value={summary.completedOrders} tone="emerald" hint="Tính vào doanh thu" />
        <StatCard label="Phải thu" value={money(summary.receivable)} tone={summary.receivable ? "amber" : "emerald"} hint={`${openDebtCount} dòng công nợ mở`} />
        <StatCard label="Phải trả" value={money(summary.payable)} tone={summary.payable ? "red" : "emerald"} hint="Nhà cung cấp và khoản phải trả" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-4">
          {tabs.map((tab) => (
            <button key={tab.id} className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "sales" ? <SalesReport rows={salesRows} /> : null}
      {activeTab === "products" ? <ProductSalesReport rows={productSalesRows} /> : null}
      {activeTab === "inventory" ? <InventoryReport rows={inventoryRows} /> : null}
      {activeTab === "debts" ? <DebtReport rows={debtRows} /> : null}
    </AdminPage>
  );
}

function SalesReport({ rows }: { rows: SalesRow[] }) {
  return <ReportShell title="Báo cáo bán hàng" count={rows.length}><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><Th>Mã đơn</Th><Th>Khách</Th><Th>Trạng thái</Th><Th>Tổng tiền</Th><Th>Ngày</Th></tr></thead><tbody>{rows.map((row) => <tr key={row.orderCode} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.orderCode}</td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3"><StatusBadge tone={orderTone(row.status)}>{viOrderStatus(row.status)}</StatusBadge></td><td className="px-4 py-3 font-semibold">{money(row.total)}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td></tr>)}</tbody></table>{!rows.length ? <EmptyState title="Chưa có dữ liệu bán hàng" description="Khi có đơn hàng, báo cáo bán hàng sẽ hiển thị tại đây." /> : null}</ReportShell>;
}

function ProductSalesReport({ rows }: { rows: ProductSalesRow[] }) {
  return <ReportShell title="Sản phẩm bán chạy" count={rows.length}><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><Th>Sản phẩm</Th><Th>SKU</Th><Th>Số lượng</Th><Th>Doanh thu</Th><Th>Lợi nhuận</Th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.product}-${row.sku}`} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.product}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3 font-semibold">{money(row.revenue)}</td><td className="px-4 py-3"><StatusBadge tone={row.profit >= 0 ? "emerald" : "red"}>{money(row.profit)}</StatusBadge></td></tr>)}</tbody></table>{!rows.length ? <EmptyState title="Chưa có sản phẩm bán ra" description="Sản phẩm hoàn tất bán hàng sẽ xuất hiện trong báo cáo này." /> : null}</ReportShell>;
}

function InventoryReport({ rows }: { rows: InventoryRow[] }) {
  return <ReportShell title="Báo cáo tồn kho" count={rows.length}><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><Th>Sản phẩm</Th><Th>SKU</Th><Th>Tồn</Th><Th>Đang giữ</Th><Th>Khả dụng</Th><Th>Giá trị</Th><Th>Tồn tối thiểu</Th></tr></thead><tbody>{rows.map((row) => <tr key={row.sku} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.product}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3">{row.reservedQuantity}</td><td className="px-4 py-3"><StatusBadge tone={row.available <= 0 ? "red" : row.available <= row.minStock ? "amber" : "emerald"}>{row.available}</StatusBadge></td><td className="px-4 py-3 font-semibold">{money(row.value)}</td><td className="px-4 py-3">{row.minStock}</td></tr>)}</tbody></table>{!rows.length ? <EmptyState title="Chưa có dữ liệu tồn kho" description="Sản phẩm có tồn kho sẽ hiển thị trong báo cáo này." /> : null}</ReportShell>;
}

function DebtReport({ rows }: { rows: DebtRow[] }) {
  return <ReportShell title="Báo cáo công nợ" count={rows.length}><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><Th>Loại</Th><Th>Đối tượng</Th><Th>Số tiền</Th><Th>Đã trả</Th><Th>Còn lại</Th><Th>Trạng thái</Th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.party}-${index}`} className="border-t border-slate-100"><td className="px-4 py-3"><StatusBadge tone={row.type === "CUSTOMER" ? "blue" : "amber"}>{row.type === "CUSTOMER" ? "Phải thu" : "Phải trả"}</StatusBadge></td><td className="px-4 py-3 font-semibold">{row.party}</td><td className="px-4 py-3">{money(row.amount)}</td><td className="px-4 py-3">{money(row.paidAmount)}</td><td className="px-4 py-3 font-semibold">{money(row.remaining)}</td><td className="px-4 py-3"><StatusBadge tone={debtTone(row.status)}>{viDebtStatus(row.status)}</StatusBadge></td></tr>)}</tbody></table>{!rows.length ? <EmptyState title="Chưa có dữ liệu công nợ" description="Các khoản phải thu/phải trả sẽ hiển thị trong báo cáo này." /> : null}</ReportShell>;
}

function ReportShell({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <DataPanel><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">{title}</h2><span className="text-sm font-semibold text-slate-500">{count} dòng</span></div>{children}</DataPanel>;
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-3 font-semibold">{children}</th>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function orderTone(status: string): Tone { return ({ NEW: "blue", CONFIRMED: "amber", PACKING: "amber", SHIPPING: "blue", COMPLETED: "emerald", CANCELLED: "red", RETURNED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function debtTone(status: string): Tone { return ({ OPEN: "amber", PARTIAL: "blue", PAID: "emerald", OVERDUE: "red", CLOSED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
function viDebtStatus(status: string) { return ({ OPEN: "Mở", PARTIAL: "Thanh toán một phần", PAID: "Đã thanh toán", OVERDUE: "Quá hạn", CLOSED: "Đã đóng" } as Record<string, string>)[status] || status; }
