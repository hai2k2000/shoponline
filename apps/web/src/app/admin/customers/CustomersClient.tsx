"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  source: string | null;
  group: string | null;
  notes: string | null;
  status: string;
  totalOrders: number;
  totalSpent: number;
  updatedAt: string;
};

type ModalState = { mode: "create" } | { mode: "edit"; row: CustomerRow } | { mode: "detail"; row: CustomerRow } | null;
type SortKey = "updatedAt" | "name" | "totalOrders" | "totalSpent" | "status";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function CustomersClient({ rows, sessionToken }: { rows: CustomerRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [group, setGroup] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const sources = useMemo(() => Array.from(new Set(rows.map((row) => row.source).filter(Boolean))) as string[], [rows]);
  const groups = useMemo(() => Array.from(new Set(rows.map((row) => row.group).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.name, row.phone || "", row.email || "", row.address || "", row.notes || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.status === status) && (!source || row.source === source) && (!group || row.group === group);
      })
      .sort((left, right) => compareCustomers(left, right, sortKey, sortDirection));
  }, [group, query, rows, sortDirection, sortKey, source, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalActive = rows.filter((row) => row.status === "ACTIVE").length;
  const totalOrders = rows.reduce((sum, row) => sum + row.totalOrders, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.totalSpent, 0);
  const vipLike = rows.filter((row) => row.totalSpent > 0 || row.totalOrders > 0).length;

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Quan hệ / Khách hàng"
        title="Quản lý khách hàng"
        description="Quản lý hồ sơ khách hàng, nguồn, phân nhóm, ghi chú và giá trị mua hàng để phục vụ bán hàng và chăm sóc sau bán."
        action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo khách hàng</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng khách" value={rows.length} hint={`${totalActive} đang hoạt động`} />
        <StatCard label="Có lịch sử mua" value={vipLike} tone={vipLike ? "blue" : "slate"} hint="Có đơn hoặc chi tiêu" />
        <StatCard label="Tổng đơn" value={totalOrders} hint="Theo thống kê khách hàng" />
        <StatCard label="Tổng chi tiêu" value={money(totalSpent)} tone="emerald" hint="Từ đơn hàng hoàn tất" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} khách`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên, SĐT, email, địa chỉ, ghi chú" />
        <SelectField label="Nguồn" value={source} onChange={(value) => { setSource(value); resetPage(); }}><option value="">Tất cả</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label="Nhóm" value={group} onChange={(value) => { setGroup(value); resetPage(); }}><option value="">Tất cả</option>{groups.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <SortableTh label="Khách hàng" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Liên hệ</th>
              <th className="px-4 py-3 font-semibold">Nguồn</th>
              <th className="px-4 py-3 font-semibold">Nhóm</th>
              <SortableTh label="Đơn" active={sortKey === "totalOrders"} direction={sortDirection} onClick={() => toggleSort("totalOrders", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Chi tiêu" active={sortKey === "totalSpent"} direction={sortDirection} onClick={() => toggleSort("totalSpent", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 max-w-64 truncate text-xs text-slate-500">{row.address || "Chưa có địa chỉ"}</p></td>
                <td className="px-4 py-3">{row.phone || "-"}<p className="text-xs text-slate-500">{row.email || ""}</p></td>
                <td className="px-4 py-3">{row.source || "-"}</td>
                <td className="px-4 py-3">{row.group || "-"}</td>
                <td className="px-4 py-3 font-semibold">{row.totalOrders}</td>
                <td className="px-4 py-3 font-semibold">{money(row.totalSpent)}</td>
                <td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td>
                <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><RowButton icon={<Eye className="size-4" />} label="Xem" onClick={() => setModal({ mode: "detail", row })} /><RowButton icon={<Pencil className="size-4" />} label="Sửa" onClick={() => setModal({ mode: "edit", row })} />{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có khách hàng phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo hồ sơ khách hàng mới." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "detail" ? <CustomerDetail row={modal.row} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "create" || modal?.mode === "edit" ? <CustomerModal modal={modal} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function CustomerModal({ modal, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: CustomerRow }>; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/customers" method="post" className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={row ? "update" : "create"} />
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{row ? "Sửa khách hàng" : "Tạo khách hàng"}</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="grid gap-3 overflow-y-auto p-5 md:grid-cols-2">
          <Field label="Tên khách hàng"><input required className={inputClass} name="name" defaultValue={row?.name || ""} /></Field>
          <Field label="SĐT"><input className={inputClass} name="phone" defaultValue={row?.phone || ""} /></Field>
          <Field label="Email"><input className={inputClass} name="email" type="email" defaultValue={row?.email || ""} /></Field>
          <Field label="Nguồn"><input className={inputClass} name="source" defaultValue={row?.source || ""} placeholder="Facebook, Shopee, Website..." /></Field>
          <Field label="Nhóm"><input className={inputClass} name="group" defaultValue={row?.group || ""} placeholder="VIP, Bán lẻ, Đại lý..." /></Field>
          <Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field>
          <Field label="Địa chỉ" wide><input className={inputClass} name="address" defaultValue={row?.address || ""} /></Field>
          <Field label="Ghi chú" wide><textarea className={textareaClass} name="notes" rows={4} defaultValue={row?.notes || ""} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit">Lưu</Button></div>
      </form>
    </div>
  );
}

function ArchiveButton({ row, sessionToken }: { row: CustomerRow; sessionToken: string }) {
  return <form action="/api/admin/customers/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ khách hàng này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50" type="submit"><Trash2 className="size-4" />Lưu trữ</button></form>;
}

function CustomerDetail({ row, onClose }: { row: CustomerRow; onClose: () => void }) {
  return <ModalShell title={row.name} onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="SĐT" value={row.phone || "-"} /><Info label="Email" value={row.email || "-"} /><Info label="Nguồn" value={row.source || "-"} /><Info label="Nhóm" value={row.group || "-"} /><Info label="Trạng thái" value={viStatus(row.status)} /><Info label="Cập nhật" value={dateText(row.updatedAt)} /><Info label="Tổng đơn" value={row.totalOrders} /><Info label="Tổng chi tiêu" value={money(row.totalSpent)} /><Info label="Địa chỉ" value={row.address || "-"} wide /><Info label="Ghi chú" value={row.notes || "-"} wide /></div></ModalShell>;
}

function RowButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={onClick}>{icon}{label}</button>;
}
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "updatedAt" ? "desc" : "asc"); } }
function compareCustomers(left: CustomerRow, right: CustomerRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "updatedAt") return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * modifier; if (key === "totalOrders" || key === "totalSpent") return (left[key] - right[key]) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ ACTIVE: "Đang hoạt động", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
