"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type ExpenseRow = { id: string; category: string; title: string; amount: number; note: string | null; status: string; createdAt: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: ExpenseRow } | { mode: "detail"; row: ExpenseRow } | null;
type SortKey = "createdAt" | "title" | "category" | "amount" | "status";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function ExpensesClient({ rows, sessionToken, initialQuery = "" }: { rows: ExpenseRow[]; sessionToken: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category))).sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => (!term || [row.title, row.category, row.note || ""].some((value) => value.toLowerCase().includes(term))) && (!category || row.category === category) && (!status || row.status === status))
      .sort((left, right) => compareExpenses(left, right, sortKey, sortDirection));
  }, [category, query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeRows = rows.filter((row) => row.status === "ACTIVE");
  const activeTotal = activeRows.reduce((sum, row) => sum + row.amount, 0);
  const archivedCount = rows.filter((row) => row.status === "ARCHIVED").length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Tài chính / Chi phí" title="Quản lý chi phí" description="Theo dõi chi phí vận hành, marketing, nhập hàng và các khoản chi ảnh hưởng trực tiếp tới lợi nhuận." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo chi phí</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng dòng" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang tính" value={activeRows.length} tone="emerald" hint="Được tính vào báo cáo lợi nhuận" />
        <StatCard label="Tổng chi phí" value={money(activeTotal)} tone={activeTotal ? "amber" : "slate"} hint="Tổng các khoản đang tính" />
        <StatCard label="Lưu trữ" value={archivedCount} tone={archivedCount ? "red" : "slate"} hint={`${categories.length} danh mục`} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} dòng`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên chi phí, danh mục, ghi chú" />
        <SelectField label="Danh mục" value={category} onChange={(value) => { setCategory(value); resetPage(); }}><option value="">Tất cả</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
      </FilterBar>

      {initialQuery ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Dang mo chi phi theo tu khoa <span className="font-mono">{initialQuery}</span>.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span>{filtered.length} dong chi phi dang loc</span>
        <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href={expenseExportHref(query, category, status)}>Tai CSV</a>
      </div>

      <DataPanel>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Chi phí" active={sortKey === "title"} direction={sortDirection} onClick={() => toggleSort("title", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Danh mục" active={sortKey === "category"} direction={sortDirection} onClick={() => toggleSort("category", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Số tiền" active={sortKey === "amount"} direction={sortDirection} onClick={() => toggleSort("amount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Ngày" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.title}</strong><p className="mt-1 max-w-72 truncate text-xs text-slate-500">{row.note || "Không có ghi chú"}</p></td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3 font-semibold">{money(row.amount)}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button><Button variant="outline" onClick={() => setModal({ mode: "edit", row })}>Sửa</Button>{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có chi phí phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo khoản chi mới từ nút Tạo chi phí." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "detail" ? <ExpenseDetail row={modal.row} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "create" || modal?.mode === "edit" ? <ExpenseModal modal={modal} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function ExpenseModal({ modal, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: ExpenseRow }>; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return <ModalShell title={row ? "Sửa chi phí" : "Tạo chi phí"} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="expense-form">Lưu</button></>}><form id="expense-form" action="/api/admin/expenses" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} />{row ? <input type="hidden" name="id" value={row.id} /> : null}<Field label="Tên chi phí"><input required className={inputClass} name="title" defaultValue={row?.title || ""} /></Field><Field label="Danh mục"><input required className={inputClass} name="category" defaultValue={row?.category || ""} placeholder="Marketing, Vận hành..." /></Field><Field label="Số tiền"><input required className={inputClass} name="amount" type="number" min={1} defaultValue={row?.amount || 0} /></Field><Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={4} defaultValue={row?.note || ""} /></Field></form></ModalShell>;
}

function ArchiveButton({ row, sessionToken }: { row: ExpenseRow; sessionToken: string }) { return <form action="/api/admin/expenses/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ chi phí này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Lưu trữ</button></form>; }
function ExpenseDetail({ row, onClose }: { row: ExpenseRow; onClose: () => void }) { return <ModalShell title={row.title} onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="Danh mục" value={row.category} /><Info label="Số tiền" value={money(row.amount)} /><Info label="Ngày tạo" value={dateText(row.createdAt)} /><Info label="Trạng thái" value={viStatus(row.status)} /><Info label="Ghi chú" value={row.note || "-"} wide /></div></ModalShell>; }
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "createdAt" || nextKey === "amount" ? "desc" : "asc"); } }
function compareExpenses(left: ExpenseRow, right: ExpenseRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt") return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier; if (key === "amount") return (left.amount - right.amount) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ ACTIVE: "Đang tính", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
function expenseExportHref(query: string, category: string, status: string) { const params = new URLSearchParams(); if (query.trim()) params.set("search", query.trim()); if (category) params.set("category", category); if (status) params.set("status", status); const suffix = params.toString(); return `/api/admin/finance/expenses/export${suffix ? `?${suffix}` : ""}`; }
