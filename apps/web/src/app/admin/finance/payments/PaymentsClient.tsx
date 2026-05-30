"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type OrderOption = { id: string; orderCode: string; customer: string; total: number; paid: number; remaining: number; paymentStatus: string };
type PaymentRow = { id: string; orderCode: string; customer: string; amount: number; method: string; reference: string | null; note: string | null; receivedBy: string | null; createdAt: string };
type SortKey = "createdAt" | "orderCode" | "customer" | "amount" | "method";

const methods = ["CASH", "BANK_TRANSFER", "COD", "MOMO", "OTHER"];
const pageSize = 12;

export function PaymentsClient({ orders, payments, sessionToken, initialQuery = "" }: { orders: OrderOption[]; payments: PaymentRow[]; sessionToken: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [method, setMethod] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return payments
      .filter((row) => {
        const matchesTerm = !term || [row.orderCode, row.customer, row.method, row.reference || "", row.note || "", row.receivedBy || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!method || row.method === method);
      })
      .sort((left, right) => comparePayments(left, right, sortKey, sortDirection));
  }, [method, payments, query, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);
  const unpaidOrders = orders.filter((order) => order.remaining > 0);
  const partialOrders = orders.filter((order) => order.paymentStatus === "PARTIAL").length;

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Tài chính / Thanh toán"
        title="Giao dịch thanh toán"
        description="Ghi nhận từng lần thu tiền, đối soát phương thức thanh toán và tự cập nhật trạng thái thanh toán của đơn hàng."
        action={<Button onClick={() => setModalOpen(true)}><Plus className="mr-2 size-4" />Ghi nhận thanh toán</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng giao dịch" value={payments.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đã thu" value={money(totalPaid)} tone="emerald" hint="Tổng giao dịch đã ghi nhận" />
        <StatCard label="Còn phải thu" value={money(totalRemaining)} tone={totalRemaining ? "amber" : "emerald"} hint={`${unpaidOrders.length} đơn còn nợ`} />
        <StatCard label="Thanh toán một phần" value={partialOrders} tone={partialOrders ? "blue" : "slate"} hint="Cần tiếp tục theo dõi" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${payments.length} giao dịch`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Mã đơn, khách hàng, phương thức, tham chiếu" />
        <SelectField label="Phương thức" value={method} onChange={(value) => { setMethod(value); resetPage(); }}><option value="">Tất cả</option>{methods.map((item) => <option key={item} value={item}>{viMethod(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="createdAt:desc">Mới nhất</option><option value="amount:desc">Số tiền cao trước</option><option value="amount:asc">Số tiền thấp trước</option><option value="customer:asc">Khách A-Z</option><option value="method:asc">Phương thức A-Z</option></SelectField>
      </FilterBar>

      {initialQuery ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Đang mở giao dịch thanh toán theo mã <span className="font-mono">{initialQuery}</span>.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>{filtered.length} giao dich thanh toan dang loc</span>
        <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href={paymentExportHref(query, method)}>Tai CSV</a>
      </div>

      <DataPanel>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <SortableTh label="Mã đơn" active={sortKey === "orderCode"} direction={sortDirection} onClick={() => toggleSort("orderCode", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Khách hàng" active={sortKey === "customer"} direction={sortDirection} onClick={() => toggleSort("customer", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Số tiền" active={sortKey === "amount"} direction={sortDirection} onClick={() => toggleSort("amount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Phương thức" active={sortKey === "method"} direction={sortDirection} onClick={() => toggleSort("method", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Tham chiếu</th>
              <th className="px-4 py-3 font-semibold">Người thu</th>
              <SortableTh label="Ngày" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
            </tr>
          </thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3 font-semibold">{row.orderCode}<p className="mt-1 max-w-60 truncate text-xs text-slate-500">{row.note || ""}</p><div className="mt-2 flex flex-wrap gap-2"><a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/orders?search=${encodeURIComponent(row.orderCode)}`}>Mở đơn hàng</a><button className="text-xs font-semibold text-emerald-700 hover:underline" onClick={() => setSelectedPayment(row)} type="button">Xem chi tiết</button></div></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3 font-semibold">{money(row.amount)}</td><td className="px-4 py-3"><StatusBadge tone={methodTone(row.method)}>{viMethod(row.method)}</StatusBadge></td><td className="px-4 py-3">{row.reference || "-"}</td><td className="px-4 py-3">{row.receivedBy || "-"}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có giao dịch phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc ghi nhận thanh toán mới." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modalOpen ? <PaymentModal orders={unpaidOrders} sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
      {selectedPayment ? <PaymentDetail row={selectedPayment} onClose={() => setSelectedPayment(null)} /> : null}
    </AdminPage>
  );
}

function PaymentDetail({ row, onClose }: { row: PaymentRow; onClose: () => void }) {
  const orderHref = `/admin/orders?search=${encodeURIComponent(row.orderCode)}`;
  const shipmentHref = `/admin/shipments?search=${encodeURIComponent(row.orderCode)}`;
  return (
    <ModalShell title={`Thanh toán ${row.orderCode}`} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={orderHref}>Mở đơn hàng</a>
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={shipmentHref}>Mở vận đơn</a>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Mã đơn" value={row.orderCode} />
          <Info label="Khách hàng" value={row.customer} />
          <Info label="Số tiền" value={money(row.amount)} />
          <Info label="Phương thức" value={viMethod(row.method)} />
          <Info label="Tham chiếu" value={row.reference || "-"} />
          <Info label="Người thu" value={row.receivedBy || "-"} />
          <Info label="Ngày ghi nhận" value={dateText(row.createdAt)} />
          <Info label="Ghi chú" value={row.note || "-"} wide />
        </div>
      </div>
    </ModalShell>
  );
}

function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>;
}

function PaymentModal({ orders, sessionToken, onClose }: { orders: OrderOption[]; sessionToken: string; onClose: () => void }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const order = orders.find((item) => item.id === orderId);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/payments" method="post" className="grid max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">Ghi nhận thanh toán</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="grid gap-3 overflow-y-auto p-5 md:grid-cols-2">
          {!orders.length ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 md:col-span-2">Không có đơn hàng còn phải thu.</div> : null}
          <Field label="Đơn hàng" wide><select required className={inputClass} name="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - còn {money(item.remaining)}</option>)}</select></Field>
          <Field label="Số tiền"><input required className={inputClass} name="amount" type="number" min={1} max={Math.max(1, order?.remaining || 1)} defaultValue={order?.remaining || 0} /></Field>
          <Field label="Phương thức"><select className={inputClass} name="method">{methods.map((item) => <option key={item} value={item}>{viMethod(item)}</option>)}</select></Field>
          <Field label="Mã tham chiếu"><input className={inputClass} name="reference" placeholder="Mã ngân hàng, COD..." /></Field>
          <Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={!orders.length}>Lưu thanh toán</Button></div>
      </form>
    </div>
  );
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "createdAt" ? "desc" : "asc"); } }
function comparePayments(left: PaymentRow, right: PaymentRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt") return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier; if (key === "amount") return (left.amount - right.amount) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function methodTone(value: string): Tone { return ({ CASH: "emerald", BANK_TRANSFER: "blue", COD: "amber", MOMO: "blue", OTHER: "slate" } as Record<string, Tone>)[value] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function paymentExportHref(query: string, method: string) { const params = new URLSearchParams(); if (query.trim()) params.set("search", query.trim()); if (method) params.set("method", method); const suffix = params.toString(); return `/api/admin/finance/payments/export${suffix ? `?${suffix}` : ""}`; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viMethod(value: string) { return ({ CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", COD: "COD", MOMO: "MoMo", OTHER: "Khác" } as Record<string, string>)[value] || value; }
