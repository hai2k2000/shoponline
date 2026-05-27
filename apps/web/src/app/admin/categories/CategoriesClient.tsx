"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type CategoryRow = { id: string; name: string; slug: string; description: string | null; sortOrder: number; status: string; updatedAt: string; parentId: string | null; parentName: string | null; productCount: number };
type ModalState = { mode: "create" } | { mode: "edit"; row: CategoryRow } | null;
type SortKey = "name" | "slug" | "parentName" | "productCount" | "sortOrder" | "status" | "updatedAt";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function CategoriesClient({ rows, sessionToken }: { rows: CategoryRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.name, row.slug, row.parentName || "", row.description || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.status === status);
      })
      .sort((left, right) => compareCategories(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const rootCount = rows.filter((row) => !row.parentId).length;
  const hiddenCount = rows.filter((row) => ["HIDDEN", "ARCHIVED"].includes(row.status)).length;
  const productTotal = rows.reduce((sum, row) => sum + row.productCount, 0);

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Danh mục" title="Quản lý danh mục" description="Quản lý danh mục nhiều cấp, thứ tự hiển thị, trạng thái và số lượng sản phẩm theo từng nhóm." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo danh mục</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng danh mục" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang dùng" value={activeCount} tone="emerald" hint="Hiển thị trong catalog" />
        <StatCard label="Danh mục gốc" value={rootCount} tone="blue" hint={`${productTotal} sản phẩm đã gắn`} />
        <StatCard label="Ẩn/lưu trữ" value={hiddenCount} tone={hiddenCount ? "amber" : "slate"} hint="Không ưu tiên hiển thị" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} danh mục`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên, slug, danh mục cha" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="sortOrder:asc">Thứ tự tăng</option><option value="updatedAt:desc">Mới cập nhật</option><option value="name:asc">Tên A-Z</option><option value="productCount:desc">Nhiều sản phẩm trước</option><option value="status:asc">Trạng thái A-Z</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Tên" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Slug" active={sortKey === "slug"} direction={sortDirection} onClick={() => toggleSort("slug", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Cha" active={sortKey === "parentName"} direction={sortDirection} onClick={() => toggleSort("parentName", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Sản phẩm" active={sortKey === "productCount"} direction={sortDirection} onClick={() => toggleSort("productCount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Thứ tự" active={sortKey === "sortOrder"} direction={sortDirection} onClick={() => toggleSort("sortOrder", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 max-w-64 truncate text-xs text-slate-500">{row.description || "Chưa có mô tả"}</p></td><td className="px-4 py-3 font-mono text-xs text-slate-600">{row.slug}</td><td className="px-4 py-3">{row.parentName || "-"}</td><td className="px-4 py-3 font-semibold">{row.productCount}</td><td className="px-4 py-3">{row.sortOrder}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "edit", row })}>Sửa</Button>{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có danh mục phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo danh mục mới từ nút Tạo danh mục." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modal ? <CategoryModal modal={modal} rows={rows} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function CategoryModal({ modal, rows, sessionToken, onClose }: { modal: Exclude<ModalState, null>; rows: CategoryRow[]; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return <ModalShell title={row ? "Sửa danh mục" : "Tạo danh mục"} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="category-form">Lưu</button></>}><form id="category-form" action="/api/admin/categories" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} />{row ? <input type="hidden" name="id" value={row.id} /> : null}<Field label="Tên danh mục"><input required className={inputClass} name="name" defaultValue={row?.name || ""} /></Field><Field label="Slug"><input className={inputClass} name="slug" defaultValue={row?.slug || ""} placeholder="Tự tạo nếu bỏ trống" /></Field><Field label="Danh mục cha"><select className={inputClass} name="parentId" defaultValue={row?.parentId || ""}><option value="">Không có</option>{rows.filter((item) => item.id !== row?.id && item.status !== "ARCHIVED").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field><Field label="Thứ tự"><input className={inputClass} name="sortOrder" type="number" defaultValue={row?.sortOrder || 0} /></Field><Field label="Mô tả" wide><textarea className={textareaClass} name="description" rows={3} defaultValue={row?.description || ""} /></Field></form></ModalShell>;
}
function ArchiveButton({ row, sessionToken }: { row: CategoryRow; sessionToken: string }) { return <form action="/api/admin/categories/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ danh mục này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Lưu trữ</button></form>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["productCount", "sortOrder", "updatedAt"].includes(nextKey) ? "desc" : "asc"); } }
function compareCategories(left: CategoryRow, right: CategoryRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "productCount" || key === "sortOrder") return (left[key] - right[key]) * modifier; if (key === "updatedAt") return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate"; }
function viStatus(status: string) { return ({ ACTIVE: "Đang dùng", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
