"use client";

type Summary = { revenue: number; expenses: number; profit: number; orders: number; completedOrders: number; receivable: number; payable: number; inventoryValue: number };
type SalesRow = { orderCode: string; customer: string; status: string; total: number; createdAt: string };
type InventoryRow = { product: string; sku: string; quantity: number; reservedQuantity: number; available: number; value: number; minStock: number };
type DebtRow = { type: string; party: string; amount: number; paidAmount: number; remaining: number; status: string };
type ProductSalesRow = { product: string; sku: string; quantity: number; revenue: number; profit: number };

export function ReportsClient({ summary, salesRows, inventoryRows, debtRows, productSalesRows }: { summary: Summary; salesRows: SalesRow[]; inventoryRows: InventoryRow[]; debtRows: DebtRow[]; productSalesRows: ProductSalesRow[] }) {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">Admin / Báo cáo</p>
          <h1 className="text-3xl font-semibold">Báo cáo vận hành</h1>
          <p className="mt-1 text-sm text-slate-600">Tổng hợp bán hàng, tồn kho, công nợ và lợi nhuận ước tính từ dữ liệu đang chạy.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Doanh thu" value={money(summary.revenue)} />
          <Metric label="Chi phí" value={money(summary.expenses)} />
          <Metric label="Lợi nhuận ước tính" value={money(summary.profit)} tone={summary.profit >= 0 ? "emerald" : "red"} />
          <Metric label="Giá trị tồn kho" value={money(summary.inventoryValue)} />
          <Metric label="Tổng đơn" value={summary.orders} />
          <Metric label="Đơn hoàn tất" value={summary.completedOrders} />
          <Metric label="Phải thu" value={money(summary.receivable)} />
          <Metric label="Phải trả" value={money(summary.payable)} />
        </section>

        <ReportSection title="Báo cáo bán hàng" action={() => downloadCsv("sales-report.csv", salesRows)} headers={["Mã đơn", "Khách", "Trạng thái", "Tổng tiền", "Ngày"]}>
          {salesRows.map((row) => <tr key={row.orderCode} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.orderCode}</td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{viOrderStatus(row.status)}</td><td className="px-4 py-3">{money(row.total)}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td></tr>)}
        </ReportSection>

        <ReportSection title="Sản phẩm bán chạy" action={() => downloadCsv("product-sales-report.csv", productSalesRows)} headers={["Sản phẩm", "SKU", "Số lượng", "Doanh thu", "Lợi nhuận"]}>
          {productSalesRows.map((row) => <tr key={`${row.product}-${row.sku}`} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.product}</td><td className="px-4 py-3">{row.sku}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3">{money(row.revenue)}</td><td className="px-4 py-3">{money(row.profit)}</td></tr>)}
        </ReportSection>

        <ReportSection title="Báo cáo tồn kho" action={() => downloadCsv("inventory-report.csv", inventoryRows)} headers={["Sản phẩm", "SKU", "Tồn", "Đang giữ", "Khả dụng", "Giá trị", "Tồn tối thiểu"]}>
          {inventoryRows.map((row) => <tr key={row.sku} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.product}</td><td className="px-4 py-3">{row.sku}</td><td className="px-4 py-3">{row.quantity}</td><td className="px-4 py-3">{row.reservedQuantity}</td><td className="px-4 py-3">{row.available}</td><td className="px-4 py-3">{money(row.value)}</td><td className="px-4 py-3">{row.minStock}</td></tr>)}
        </ReportSection>

        <ReportSection title="Báo cáo công nợ" action={() => downloadCsv("debt-report.csv", debtRows)} headers={["Loại", "Đối tượng", "Số tiền", "Đã trả", "Còn lại", "Trạng thái"]}>
          {debtRows.map((row, index) => <tr key={`${row.party}-${index}`} className="border-t border-slate-100"><td className="px-4 py-3">{row.type === "CUSTOMER" ? "Phải thu" : "Phải trả"}</td><td className="px-4 py-3 font-semibold">{row.party}</td><td className="px-4 py-3">{money(row.amount)}</td><td className="px-4 py-3">{money(row.paidAmount)}</td><td className="px-4 py-3">{money(row.remaining)}</td><td className="px-4 py-3">{viDebtStatus(row.status)}</td></tr>)}
        </ReportSection>
      </div>
    </main>
  );
}

function ReportSection({ title, action, headers, children }: { title: string; action: () => void; headers: string[]; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">{title}</h2><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={action}>Xuất CSV</button></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr>{headers.map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>;
}
function Metric({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "emerald" | "red" }) { const colors = { slate: "text-slate-950", emerald: "text-emerald-700", red: "text-red-700" }; return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className={`mt-2 block text-2xl ${colors[tone]}`}>{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
function viDebtStatus(status: string) { return ({ OPEN: "Mở", PARTIAL: "Thanh toán một phần", PAID: "Đã thanh toán", OVERDUE: "Quá hạn", CLOSED: "Đã đóng" } as Record<string, string>)[status] || status; }
function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
