"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";

type PromotionRow = { id: string; code: string; name: string; discountType: string; discountValue: number; minOrder: number; maxDiscount: number | null; usageLimit: number | null; usedCount: number; status: string; startsAt: string | null; endsAt: string | null };
type SortKey = "code" | "name" | "discountValue" | "minOrder" | "usedCount" | "status" | "endsAt";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function PromotionsClient({ rows, sessionToken }: { rows: PromotionRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("endsAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => (!term || [row.code, row.name, row.status].some((value) => value.toLowerCase().includes(term))) && (!status || row.status === status))
      .sort((left, right) => comparePromotions(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const usageTotal = rows.reduce((sum, row) => sum + row.usedCount, 0);
  const limitedCount = rows.filter((row) => row.usageLimit != null).length;
  const expiredCount = rows.filter((row) => row.endsAt && new Date(row.endsAt).getTime() < now).length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Bán hàng / Khuyến mãi" title="Khuyến mãi" description="Tạo và quản lý mã giảm giá áp dụng ở checkout, theo dõi lượt dùng, giới hạn và thời hạn hiệu lực." action={<Button onClick={() => setModalOpen(true)}><Plus className="mr-2 size-4" />Tạo mã</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng mã" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang bật" value={activeCount} tone="emerald" hint="Có thể áp dụng checkout" />
        <StatCard label="Lượt dùng" value={usageTotal} tone={usageTotal ? "blue" : "slate"} hint={`${limitedCount} mã có giới hạn`} />
        <StatCard label="Hết hạn" value={expiredCount} tone={expiredCount ? "amber" : "slate"} hint="Cần rà soát định kỳ" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} mã`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Mã, tên chương trình" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="endsAt:asc">Sắp hết hạn</option><option value="usedCount:desc">Dùng nhiều trước</option><option value="discountValue:desc">Giảm cao trước</option><option value="code:asc">Mã A-Z</option><option value="status:asc">Trạng thái A-Z</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Mã" active={sortKey === "code"} direction={sortDirection} onClick={() => toggleSort("code", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Tên" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Giảm" active={sortKey === "discountValue"} direction={sortDirection} onClick={() => toggleSort("discountValue", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Đơn tối thiểu" active={sortKey === "minOrder"} direction={sortDirection} onClick={() => toggleSort("minOrder", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Lượt dùng" active={sortKey === "usedCount"} direction={sortDirection} onClick={() => toggleSort("usedCount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3 font-semibold">{row.code}<p className="mt-1 text-xs text-slate-500">{row.endsAt ? `Hết hạn ${dateText(row.endsAt)}` : "Không giới hạn ngày"}</p></td><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.discountType === "PERCENT" ? `${row.discountValue}%` : money(row.discountValue)}{row.maxDiscount ? <p className="text-xs text-slate-500">Tối đa {money(row.maxDiscount)}</p> : null}</td><td className="px-4 py-3">{money(row.minOrder)}</td><td className="px-4 py-3">{row.usedCount}{row.usageLimit ? ` / ${row.usageLimit}` : ""}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><form className="flex justify-end" action="/api/admin/promotions/toggle" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" type="submit">{row.status === "ACTIVE" ? "Tắt" : "Bật"}</button></form></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có mã phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo mã giảm giá mới từ nút Tạo mã." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modalOpen ? <PromotionModal sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </AdminPage>
  );
}

function PromotionModal({ sessionToken, onClose }: { sessionToken: string; onClose: () => void }) {
  return <ModalShell title="Tạo mã giảm giá" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="promotion-form">Lưu mã</button></>}><form id="promotion-form" action="/api/admin/promotions" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><Field label="Mã"><input required className={`${inputClass} uppercase`} name="code" /></Field><Field label="Tên chương trình"><input required className={inputClass} name="name" /></Field><Field label="Loại giảm"><select className={inputClass} name="discountType"><option value="FIXED">Số tiền</option><option value="PERCENT">Phần trăm</option></select></Field><Field label="Giá trị"><input required className={inputClass} name="discountValue" type="number" min={1} /></Field><Field label="Đơn tối thiểu"><input className={inputClass} name="minOrder" type="number" min={0} defaultValue={0} /></Field><Field label="Giảm tối đa"><input className={inputClass} name="maxDiscount" type="number" min={0} /></Field><Field label="Giới hạn lượt"><input className={inputClass} name="usageLimit" type="number" min={1} /></Field><Field label="Ngày hết hạn"><input className={inputClass} name="endsAt" type="date" /></Field></form></ModalShell>;
}
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["discountValue", "minOrder", "usedCount"].includes(nextKey) ? "desc" : "asc"); } }
function comparePromotions(left: PromotionRow, right: PromotionRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (["discountValue", "minOrder", "usedCount"].includes(key)) return ((left[key] as number) - (right[key] as number)) * modifier; if (key === "endsAt") return ((left.endsAt ? new Date(left.endsAt).getTime() : Number.MAX_SAFE_INTEGER) - (right.endsAt ? new Date(right.endsAt).getTime() : Number.MAX_SAFE_INTEGER)) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ ACTIVE: "Đang bật", DRAFT: "Nháp", HIDDEN: "Đã tắt", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
