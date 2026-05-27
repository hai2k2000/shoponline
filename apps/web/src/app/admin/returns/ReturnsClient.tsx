"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type OrderOption = { id: string; orderCode: string; customer: string; total: number; paid: number; orderStatus: string };
type ReturnRow = { id: string; code: string; orderCode: string; customer: string; status: string; reason: string; refundAmount: number; receivedAt: string | null; refundedAt: string | null; note: string | null; createdAt: string };
type SortKey = "createdAt" | "code" | "orderCode" | "customer" | "refundAmount" | "status" | "receivedAt" | "refundedAt";

const reasons = ["Khách đổi ý", "Sản phẩm lỗi", "Giao sai hàng", "Giao chậm", "Khác"];
const statuses = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"];
const pageSize = 12;

export function ReturnsClient({ rows, orders, sessionToken }: { rows: ReturnRow[]; orders: OrderOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => (!term || [row.code, row.orderCode, row.customer, row.reason, row.note || ""].some((value) => value.toLowerCase().includes(term))) && (!status || row.status === status))
      .sort((left, right) => compareReturns(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const processing = rows.filter((row) => ["REQUESTED", "APPROVED"].includes(row.status)).length;
  const received = rows.filter((row) => row.status === "RECEIVED").length;
  const refundedTotal = rows.filter((row) => row.status === "REFUNDED").reduce((sum, row) => sum + row.refundAmount, 0);
  const rejected = rows.filter((row) => row.status === "REJECTED").length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Đơn hàng / Trả hàng" title="Trả hàng và hoàn tiền" description="Quản lý yêu cầu trả hàng, duyệt yêu cầu, nhận hàng hoàn kho và ghi nhận hoàn tiền." action={<Button onClick={() => setModalOpen(true)}><Plus className="mr-2 size-4" />Tạo yêu cầu</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng yêu cầu" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang xử lý" value={processing} tone={processing ? "amber" : "slate"} hint="Chờ duyệt hoặc nhận hàng" />
        <StatCard label="Đã nhận hàng" value={received} tone={received ? "blue" : "slate"} hint="Chờ hoàn tiền" />
        <StatCard label="Đã hoàn tiền" value={money(refundedTotal)} tone={refundedTotal ? "emerald" : "slate"} hint={rejected ? `${rejected} yêu cầu bị từ chối` : "Không có từ chối"} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} yêu cầu`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Mã trả hàng, mã đơn, khách hàng, lý do" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="createdAt:desc">Mới nhất</option><option value="refundAmount:desc">Hoàn tiền cao trước</option><option value="customer:asc">Khách A-Z</option><option value="status:asc">Trạng thái A-Z</option><option value="receivedAt:desc">Ngày nhận mới trước</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Mã yêu cầu" active={sortKey === "code"} direction={sortDirection} onClick={() => toggleSort("code", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Đơn hàng" active={sortKey === "orderCode"} direction={sortDirection} onClick={() => toggleSort("orderCode", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Khách hàng" active={sortKey === "customer"} direction={sortDirection} onClick={() => toggleSort("customer", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 font-semibold">Lý do</th><SortableTh label="Hoàn tiền" active={sortKey === "refundAmount"} direction={sortDirection} onClick={() => toggleSort("refundAmount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.code}</strong><p className="mt-1 text-xs text-slate-500">{dateText(row.createdAt)}</p></td><td className="px-4 py-3">{row.orderCode}<p className="mt-1 max-w-60 truncate text-xs text-slate-500">{row.note || "Không có ghi chú"}</p></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{row.reason}</td><td className="px-4 py-3 font-semibold">{money(row.refundAmount)}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><ReturnActions row={row} sessionToken={sessionToken} /></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có yêu cầu phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo yêu cầu trả hàng mới từ nút Tạo yêu cầu." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modalOpen ? <ReturnModal orders={orders} sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </AdminPage>
  );
}

function ReturnModal({ orders, sessionToken, onClose }: { orders: OrderOption[]; sessionToken: string; onClose: () => void }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const order = orders.find((item) => item.id === orderId);
  return <ModalShell title="Tạo yêu cầu trả hàng" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-55" type="submit" form="return-form" disabled={!orders.length}>Lưu yêu cầu</button></>}><form id="return-form" action="/api/admin/returns" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} />{!orders.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 md:col-span-2">Không có đơn hàng phù hợp để tạo yêu cầu trả hàng.</div> : null}<Field label="Đơn hàng" wide><select required className={inputClass} name="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - {money(item.total)}</option>)}</select></Field><Field label="Lý do"><select className={inputClass} name="reason">{reasons.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Số tiền hoàn"><input className={inputClass} name="refundAmount" type="number" min={0} max={Math.max(0, order?.paid || order?.total || 0)} defaultValue={order?.paid || 0} /></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} /></Field></form></ModalShell>;
}
function ReturnActions({ row, sessionToken }: { row: ReturnRow; sessionToken: string }) { const next = row.status === "REQUESTED" ? [["APPROVED", "Duyệt"], ["REJECTED", "Từ chối"]] : row.status === "APPROVED" ? [["RECEIVED", "Nhận hàng"]] : row.status === "RECEIVED" ? [["REFUNDED", "Hoàn tiền"]] : []; if (!next.length) return <span className="block text-right text-sm text-slate-400">-</span>; return <div className="flex flex-wrap justify-end gap-2">{next.map(([status, label]) => <form key={status} action="/api/admin/returns/status" method="post" onSubmit={(event) => { if (status === "REJECTED" && !confirm("Từ chối yêu cầu trả hàng này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={status} /><button className={`inline-flex min-h-10 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition ${status === "REJECTED" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-300 text-slate-800 hover:bg-slate-50"}`} type="submit">{label}</button></form>)}</div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["createdAt", "refundAmount", "receivedAt", "refundedAt"].includes(nextKey) ? "desc" : "asc"); } }
function compareReturns(left: ReturnRow, right: ReturnRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "refundAmount") return (left.refundAmount - right.refundAmount) * modifier; if (["createdAt", "receivedAt", "refundedAt"].includes(key)) return ((left[key] ? new Date(left[key]).getTime() : 0) - (right[key] ? new Date(right[key]).getTime() : 0)) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ REQUESTED: "amber", APPROVED: "blue", RECEIVED: "blue", REFUNDED: "emerald", REJECTED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ REQUESTED: "Đã yêu cầu", APPROVED: "Đã duyệt", RECEIVED: "Đã nhận hàng", REFUNDED: "Đã hoàn tiền", REJECTED: "Từ chối" } as Record<string, string>)[status] || status; }
