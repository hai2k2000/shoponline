"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type SupplierRow = { id: string; name: string; phone: string | null; email: string | null; address: string | null; taxCode: string | null; note: string | null; status: string; debtCount: number; openDebt: number };
type ModalState = { mode: "create" } | { mode: "edit"; row: SupplierRow } | { mode: "detail"; row: SupplierRow } | null;
type SortKey = "name" | "phone" | "taxCode" | "openDebt" | "debtCount" | "status";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function SuppliersClient({ rows, sessionToken }: { rows: SupplierRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.name, row.phone || "", row.email || "", row.address || "", row.taxCode || "", row.note || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.status === status);
      })
      .sort((left, right) => compareSuppliers(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const openDebt = rows.reduce((sum, row) => sum + row.openDebt, 0);
  const suppliersWithDebt = rows.filter((row) => row.debtCount > 0).length;
  const archivedCount = rows.filter((row) => row.status === "ARCHIVED").length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Nhà cung cấp" title="Quản lý nhà cung cấp" description="Quản lý hồ sơ nhà cung cấp, liên hệ, mã số thuế và công nợ mua hàng trong một bảng tập trung." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo nhà cung cấp</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng nhà cung cấp" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang hoạt động" value={activeCount} tone="emerald" hint="Có thể chọn trong quy trình nhập hàng" />
        <StatCard label="Có công nợ" value={suppliersWithDebt} tone={suppliersWithDebt ? "amber" : "slate"} hint={money(openDebt)} />
        <StatCard label="Lưu trữ" value={archivedCount} tone={archivedCount ? "red" : "slate"} hint="Không dùng cho giao dịch mới" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} nhà cung cấp`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên, SĐT, email, mã số thuế" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="name:asc">Tên A-Z</option><option value="name:desc">Tên Z-A</option><option value="openDebt:desc">Công nợ cao trước</option><option value="debtCount:desc">Nhiều khoản nợ trước</option><option value="status:asc">Trạng thái A-Z</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Nhà cung cấp" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Liên hệ" active={sortKey === "phone"} direction={sortDirection} onClick={() => toggleSort("phone", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Mã số thuế" active={sortKey === "taxCode"} direction={sortDirection} onClick={() => toggleSort("taxCode", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Công nợ" active={sortKey === "openDebt"} direction={sortDirection} onClick={() => toggleSort("openDebt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 max-w-72 truncate text-xs text-slate-500">{row.address || "Chưa có địa chỉ"}</p></td><td className="px-4 py-3">{row.phone || "-"}<p className="text-xs text-slate-500">{row.email || ""}</p></td><td className="px-4 py-3">{row.taxCode || "-"}</td><td className="px-4 py-3"><strong>{money(row.openDebt)}</strong><p className="text-xs text-slate-500">{row.debtCount} khoản</p></td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button><Button variant="outline" onClick={() => setModal({ mode: "edit", row })}>Sửa</Button>{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có nhà cung cấp phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo hồ sơ nhà cung cấp mới từ nút Tạo nhà cung cấp." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "detail" ? <SupplierDetail row={modal.row} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "create" || modal?.mode === "edit" ? <SupplierModal modal={modal} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function SupplierModal({ modal, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: SupplierRow }>; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return <ModalShell title={row ? "Sửa nhà cung cấp" : "Tạo nhà cung cấp"} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="supplier-form">Lưu</button></>}><form id="supplier-form" action="/api/admin/suppliers" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} />{row ? <input type="hidden" name="id" value={row.id} /> : null}<Field label="Tên nhà cung cấp"><input required className={inputClass} name="name" defaultValue={row?.name || ""} /></Field><Field label="SĐT"><input className={inputClass} name="phone" defaultValue={row?.phone || ""} /></Field><Field label="Email"><input className={inputClass} name="email" type="email" defaultValue={row?.email || ""} /></Field><Field label="Mã số thuế"><input className={inputClass} name="taxCode" defaultValue={row?.taxCode || ""} /></Field><Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field><Field label="Địa chỉ" wide><input className={inputClass} name="address" defaultValue={row?.address || ""} /></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={4} defaultValue={row?.note || ""} /></Field></form></ModalShell>;
}
function ArchiveButton({ row, sessionToken }: { row: SupplierRow; sessionToken: string }) { return <form action="/api/admin/suppliers/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ nhà cung cấp này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Lưu trữ</button></form>; }
function SupplierDetail({ row, onClose }: { row: SupplierRow; onClose: () => void }) { return <ModalShell title={row.name} onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="SĐT" value={row.phone || "-"} /><Info label="Email" value={row.email || "-"} /><Info label="Mã số thuế" value={row.taxCode || "-"} /><Info label="Trạng thái" value={viStatus(row.status)} /><Info label="Công nợ mở" value={money(row.openDebt)} /><Info label="Số khoản công nợ" value={row.debtCount} /><Info label="Địa chỉ" value={row.address || "-"} wide /><Info label="Ghi chú" value={row.note || "-"} wide /></div></ModalShell>; }
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["openDebt", "debtCount"].includes(nextKey) ? "desc" : "asc"); } }
function compareSuppliers(left: SupplierRow, right: SupplierRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "openDebt" || key === "debtCount") return (left[key] - right[key]) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function viStatus(status: string) { return ({ ACTIVE: "Đang hoạt động", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
