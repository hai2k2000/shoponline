"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type OrderOption = { id: string; orderCode: string; customer: string; orderStatus: string; total: number };
type ShipmentRow = { id: string; orderCode: string; customer: string; carrier: string; service: string | null; trackingCode: string | null; shippingFee: number; status: string; shippedAt: string | null; deliveredAt: string | null; note: string | null; createdBy: string | null; createdAt: string };
type ModalState = { mode: "create" } | { mode: "detail"; row: ShipmentRow } | null;
type SortKey = "createdAt" | "orderCode" | "customer" | "carrier" | "shippingFee" | "status" | "shippedAt";

const statuses = ["PENDING", "PACKED", "SHIPPED", "DELIVERED", "FAILED", "RETURNED"];
const pageSize = 12;

export function ShipmentsClient({ rows, orders, sessionToken, initialQuery = "" }: { rows: ShipmentRow[]; orders: OrderOption[]; sessionToken: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.orderCode, row.customer, row.carrier, row.service || "", row.trackingCode || "", row.note || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.status === status);
      })
      .sort((left, right) => compareShipments(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const processing = rows.filter((row) => ["PENDING", "PACKED"].includes(row.status)).length;
  const shipping = rows.filter((row) => row.status === "SHIPPED").length;
  const delivered = rows.filter((row) => row.status === "DELIVERED").length;
  const failed = rows.filter((row) => ["FAILED", "RETURNED"].includes(row.status)).length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Vận chuyển" title="Quản lý vận đơn" description="Theo dõi đơn vị giao hàng, mã vận đơn, trạng thái gửi, giao thành công và các trường hợp giao lỗi." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo vận đơn</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng vận đơn" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang xử lý" value={processing} tone={processing ? "amber" : "slate"} hint="Chờ đóng gói/gửi hàng" />
        <StatCard label="Đang giao" value={shipping} tone={shipping ? "blue" : "slate"} hint="Theo dõi mã vận đơn" />
        <StatCard label="Đã giao" value={delivered} tone="emerald" hint={failed ? `${failed} giao lỗi/hoàn` : "Không có lỗi mở"} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} vận đơn`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Mã đơn, khách hàng, hãng giao, mã vận đơn" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viShipmentStatus(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="createdAt:desc">Mới nhất</option><option value="shippedAt:desc">Ngày gửi mới trước</option><option value="shippingFee:desc">Phí cao trước</option><option value="customer:asc">Khách A-Z</option><option value="carrier:asc">Đơn vị giao A-Z</option></SelectField>
      </FilterBar>

      {initialQuery ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Đang mở vận đơn theo mã <span className="font-mono">{initialQuery}</span>.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>{filtered.length} van don dang loc</span>
        <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href={shipmentExportHref(query, status)}>Tai CSV</a>
      </div>

      <DataPanel>
        <table className="w-full min-w-[1160px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Mã đơn" active={sortKey === "orderCode"} direction={sortDirection} onClick={() => toggleSort("orderCode", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Khách hàng" active={sortKey === "customer"} direction={sortDirection} onClick={() => toggleSort("customer", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Đơn vị giao" active={sortKey === "carrier"} direction={sortDirection} onClick={() => toggleSort("carrier", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 font-semibold">Mã vận đơn</th><SortableTh label="Phí" active={sortKey === "shippingFee"} direction={sortDirection} onClick={() => toggleSort("shippingFee", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Ngày gửi" active={sortKey === "shippedAt"} direction={sortDirection} onClick={() => toggleSort("shippedAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.orderCode}</strong><p className="mt-1 max-w-60 truncate text-xs text-slate-500">{row.note || "Không có ghi chú"}</p><div className="mt-2 flex flex-wrap gap-2"><a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/orders?search=${encodeURIComponent(row.orderCode)}`}>Mở đơn hàng</a><a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/finance/payments?search=${encodeURIComponent(row.orderCode)}`}>Mở thanh toán</a></div></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{row.carrier}<p className="text-xs text-slate-500">{row.service || ""}</p></td><td className="px-4 py-3">{row.trackingCode || "-"}</td><td className="px-4 py-3 font-semibold">{money(row.shippingFee)}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viShipmentStatus(row.status)}</StatusBadge></td><td className="px-4 py-3">{row.shippedAt ? dateText(row.shippedAt) : "-"}</td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button><StatusButtons row={row} sessionToken={sessionToken} /></div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có vận đơn phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo vận đơn mới từ nút Tạo vận đơn." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modal?.mode === "create" ? <ShipmentModal orders={orders} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "detail" ? <ShipmentDetail row={modal.row} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function ShipmentModal({ orders, sessionToken, onClose }: { orders: OrderOption[]; sessionToken: string; onClose: () => void }) {
  return <ModalShell title="Tạo vận đơn" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-55" type="submit" form="shipment-form" disabled={!orders.length}>Lưu vận đơn</button></>}><form id="shipment-form" action="/api/admin/shipments" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} />{!orders.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 md:col-span-2">Không có đơn hàng phù hợp để tạo vận đơn.</div> : null}<Field label="Đơn hàng" wide><select required className={inputClass} name="orderId">{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - {viOrderStatus(item.orderStatus)}</option>)}</select></Field><Field label="Đơn vị giao"><input required className={inputClass} name="carrier" placeholder="GHN, GHTK, Viettel Post..." /></Field><Field label="Dịch vụ"><input className={inputClass} name="service" placeholder="Nhanh, tiết kiệm..." /></Field><Field label="Mã vận đơn"><input className={inputClass} name="trackingCode" /></Field><Field label="Phí vận chuyển"><input className={inputClass} name="shippingFee" type="number" min={0} defaultValue={0} /></Field><Field label="Trạng thái"><select className={inputClass} name="status">{statuses.map((item) => <option key={item} value={item}>{viShipmentStatus(item)}</option>)}</select></Field><Field label="Ngày gửi"><input className={inputClass} name="shippedAt" type="datetime-local" /></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} /></Field></form></ModalShell>;
}
function ShipmentDetail({ row, onClose }: { row: ShipmentRow; onClose: () => void }) {
  const orderHref = `/admin/orders?search=${encodeURIComponent(row.orderCode)}`;
  const paymentHref = `/admin/finance/payments?search=${encodeURIComponent(row.orderCode)}`;
  return (
    <ModalShell title={`Vận đơn ${row.orderCode}`} onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={orderHref}>Mở đơn hàng</a>
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={paymentHref}>Mở thanh toán</a>
        </div>
        <div className="grid gap-3 md:grid-cols-2"><Info label="Khách hàng" value={row.customer} /><Info label="Trạng thái" value={viShipmentStatus(row.status)} /><Info label="Đơn vị giao" value={row.carrier} /><Info label="Dịch vụ" value={row.service || "-"} /><Info label="Mã vận đơn" value={row.trackingCode || "-"} /><Info label="Phí vận chuyển" value={money(row.shippingFee)} /><Info label="Ngày tạo" value={dateText(row.createdAt)} /><Info label="Người tạo" value={row.createdBy || "-"} /><Info label="Ngày gửi" value={row.shippedAt ? dateText(row.shippedAt) : "-"} /><Info label="Ngày giao" value={row.deliveredAt ? dateText(row.deliveredAt) : "-"} /><Info label="Ghi chú" value={row.note || "-"} wide /></div>
      </div>
    </ModalShell>
  );
}
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>; }
function StatusButtons({ row, sessionToken }: { row: ShipmentRow; sessionToken: string }) { const next = row.status === "PENDING" ? ["PACKED", "SHIPPED"] : row.status === "PACKED" ? ["SHIPPED"] : row.status === "SHIPPED" ? ["DELIVERED", "FAILED", "RETURNED"] : []; if (!next.length) return <span className="block text-right text-sm text-slate-400">-</span>; return <div className="flex flex-wrap justify-end gap-2">{next.map((item) => <form key={item} action="/api/admin/shipments/status" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={item} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" type="submit">{viShipmentStatus(item)}</button></form>)}</div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["createdAt", "shippingFee", "shippedAt"].includes(nextKey) ? "desc" : "asc"); } }
function compareShipments(left: ShipmentRow, right: ShipmentRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "shippingFee") return (left.shippingFee - right.shippingFee) * modifier; if (key === "createdAt" || key === "shippedAt") return ((left[key] ? new Date(left[key]).getTime() : 0) - (right[key] ? new Date(right[key]).getTime() : 0)) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ PENDING: "amber", PACKED: "blue", SHIPPED: "blue", DELIVERED: "emerald", FAILED: "red", RETURNED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function shipmentExportHref(query: string, status: string) { const params = new URLSearchParams(); if (query.trim()) params.set("search", query.trim()); if (status) params.set("status", status); const suffix = params.toString(); return `/api/admin/shipments/export${suffix ? `?${suffix}` : ""}`; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
function viShipmentStatus(status: string) { return ({ PENDING: "Chờ xử lý", PACKED: "Đã đóng gói", SHIPPED: "Đã gửi", DELIVERED: "Đã giao", FAILED: "Giao lỗi", RETURNED: "Hoàn về" } as Record<string, string>)[status] || status; }
