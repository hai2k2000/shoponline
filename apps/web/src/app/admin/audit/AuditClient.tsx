"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, FilterBar, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge } from "@/components/admin/ui";

type AuditRow = { id: string; user: string | null; action: string; entityType: string; entityId: string | null; description: string | null; createdAt: string };
type SortKey = "createdAt" | "user" | "action" | "entityType" | "entityId";

const pageSize = 15;

export function AuditClient({ rows }: { rows: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [todayKey] = useState(() => new Date().toDateString());

  const entityTypes = useMemo(() => Array.from(new Set(rows.map((row) => row.entityType))).sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.user || "", row.action, row.entityType, row.entityId || "", row.description || ""].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!entityType || row.entityType === entityType);
      })
      .sort((left, right) => compareAudit(left, right, sortKey, sortDirection));
  }, [entityType, query, rows, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const today = rows.filter((row) => new Date(row.createdAt).toDateString() === todayKey).length;
  const actorCount = new Set(rows.map((row) => row.user).filter(Boolean)).size;
  const mutationCount = rows.filter((row) => !["READ", "VIEW"].includes(row.action.toUpperCase())).length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Hệ thống / Nhật ký" title="Nhật ký hệ thống" description="Theo dõi thao tác quan trọng: đăng nhập, tạo đơn, nhập kho, thanh toán, hoàn tiền và thay đổi trạng thái." action={<a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50" href={`/api/admin/audit/export?${exportParams(query, entityType)}`}>Tai CSV</a>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng log" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Hôm nay" value={today} tone={today ? "blue" : "slate"} hint="Phát sinh trong ngày" />
        <StatCard label="Người dùng" value={actorCount} tone="emerald" hint="Có thao tác ghi nhận" />
        <StatCard label="Loại nghiệp vụ" value={entityTypes.length} tone="amber" hint={`${mutationCount} thao tác thay đổi`} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} log`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Người dùng, hành động, mô tả" />
        <SelectField label="Nghiệp vụ" value={entityType} onChange={(value) => { setEntityType(value); resetPage(); }}><option value="">Tất cả</option>{entityTypes.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}><option value="createdAt:desc">Mới nhất</option><option value="createdAt:asc">Cũ nhất</option><option value="user:asc">Người dùng A-Z</option><option value="action:asc">Hành động A-Z</option><option value="entityType:asc">Nghiệp vụ A-Z</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Thời gian" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Người dùng" active={sortKey === "user"} direction={sortDirection} onClick={() => toggleSort("user", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Hành động" active={sortKey === "action"} direction={sortDirection} onClick={() => toggleSort("action", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Nghiệp vụ" active={sortKey === "entityType"} direction={sortDirection} onClick={() => toggleSort("entityType", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 font-semibold">Mô tả</th><SortableTh label="ID" active={sortKey === "entityId"} direction={sortDirection} onClick={() => toggleSort("entityId", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3 whitespace-nowrap">{dateText(row.createdAt)}</td><td className="px-4 py-3">{row.user || "Hệ thống"}</td><td className="px-4 py-3"><StatusBadge>{row.action}</StatusBadge></td><td className="px-4 py-3 font-semibold">{row.entityType}</td><td className="px-4 py-3"><span className="line-clamp-2 max-w-lg">{row.description || "-"}</span></td><td className="px-4 py-3 font-mono text-xs text-slate-500">{row.entityId || "-"}</td><td className="px-4 py-3 text-right"><Button variant="outline" onClick={() => setSelected(row)}>Xem</Button></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có log phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc chờ hệ thống phát sinh thêm hoạt động." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {selected ? <AuditDetail row={selected} onClose={() => setSelected(null)} /> : null}
    </AdminPage>
  );
}

function AuditDetail({ row, onClose }: { row: AuditRow; onClose: () => void }) { return <ModalShell title="Chi tiết nhật ký" onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="Thời gian" value={dateText(row.createdAt)} /><Info label="Người dùng" value={row.user || "Hệ thống"} /><Info label="Hành động" value={row.action} /><Info label="Nghiệp vụ" value={row.entityType} /><Info label="Entity ID" value={row.entityId || "-"} wide /><Info label="Mô tả" value={row.description || "-"} wide /></div></ModalShell>; }
function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block break-words text-sm text-slate-900">{value}</strong></div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "createdAt" ? "desc" : "asc"); } }
function compareAudit(left: AuditRow, right: AuditRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt") return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)); }
function exportParams(query: string, entityType: string) { const params = new URLSearchParams(); if (query.trim()) params.set("search", query.trim()); if (entityType) params.set("entityType", entityType); return params.toString(); }
