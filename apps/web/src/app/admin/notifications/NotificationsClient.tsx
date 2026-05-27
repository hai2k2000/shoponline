"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, FilterBar, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";

type NotificationRow = { id: string; level: string; title: string; message: string | null; entityType: string | null; entityId: string | null; readAt: string | null; createdAt: string };
type SortKey = "createdAt" | "level" | "title" | "entityType" | "readAt";

const levels = ["INFO", "SUCCESS", "WARNING", "DANGER"];
const pageSize = 12;

export function NotificationsClient({ rows, sessionToken }: { rows: NotificationRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [level, setLevel] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [todayKey] = useState(() => new Date().toDateString());

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesTerm = !term || [row.title, row.message || "", row.entityType || ""].some((value) => value.toLowerCase().includes(term));
        const matchesMode = !mode || (mode === "unread" ? !row.readAt : Boolean(row.readAt));
        return matchesTerm && matchesMode && (!level || row.level === level);
      })
      .sort((left, right) => compareNotifications(left, right, sortKey, sortDirection));
  }, [level, mode, query, rows, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const unread = rows.filter((row) => !row.readAt).length;
  const warning = rows.filter((row) => ["WARNING", "DANGER"].includes(row.level)).length;
  const today = rows.filter((row) => new Date(row.createdAt).toDateString() === todayKey).length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Hệ thống / Thông báo" title="Thông báo" description="Theo dõi cảnh báo và sự kiện nghiệp vụ cần xử lý, ưu tiên các mục chưa đọc hoặc mức cảnh báo cao." action={<form action="/api/admin/notifications/read-all" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><Button type="submit">Đánh dấu đã đọc</Button></form>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng thông báo" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Chưa đọc" value={unread} tone={unread ? "amber" : "emerald"} hint="Cần xử lý" />
        <StatCard label="Cảnh báo" value={warning} tone={warning ? "red" : "slate"} hint="Warning/Danger" />
        <StatCard label="Hôm nay" value={today} tone={today ? "blue" : "slate"} hint="Phát sinh trong ngày" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} thông báo`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tiêu đề, nội dung, nghiệp vụ" />
        <SelectField label="Trạng thái" value={mode} onChange={(value) => { setMode(value); resetPage(); }}><option value="">Tất cả</option><option value="unread">Chưa đọc</option><option value="read">Đã đọc</option></SelectField>
        <SelectField label="Mức" value={level} onChange={(value) => { setLevel(value); resetPage(); }}><option value="">Tất cả</option>{levels.map((item) => <option key={item} value={item}>{viLevel(item)}</option>)}</SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Thời gian" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Mức" active={sortKey === "level"} direction={sortDirection} onClick={() => toggleSort("level", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Tiêu đề" active={sortKey === "title"} direction={sortDirection} onClick={() => toggleSort("title", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Nghiệp vụ" active={sortKey === "entityType"} direction={sortDirection} onClick={() => toggleSort("entityType", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "readAt"} direction={sortDirection} onClick={() => toggleSort("readAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className={`border-t align-top hover:bg-slate-50/70 ${row.readAt ? "border-slate-100" : "border-emerald-100 bg-emerald-50/20"}`}><td className="px-4 py-3">{dateText(row.createdAt)}</td><td className="px-4 py-3"><StatusBadge tone={levelTone(row.level)}>{viLevel(row.level)}</StatusBadge></td><td className="px-4 py-3"><strong>{row.title}</strong>{row.message ? <p className="mt-1 max-w-md truncate text-xs text-slate-500">{row.message}</p> : null}</td><td className="px-4 py-3">{row.entityType || "Hệ thống"}</td><td className="px-4 py-3">{row.readAt ? <StatusBadge>Đã đọc</StatusBadge> : <StatusBadge tone="amber">Chưa đọc</StatusBadge>}</td><td className="px-4 py-3">{!row.readAt ? <form className="flex justify-end" action="/api/admin/notifications/read" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><Button variant="outline" type="submit">Đã đọc</Button></form> : <span className="block text-right text-xs text-slate-500">{dateText(row.readAt)}</span>}</td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có thông báo phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc đánh dấu đã đọc để dọn các thông báo cũ." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
    </AdminPage>
  );
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "createdAt" || nextKey === "readAt" ? "desc" : "asc"); } }
function compareNotifications(left: NotificationRow, right: NotificationRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt" || key === "readAt") return ((left[key] ? new Date(left[key]).getTime() : 0) - (right[key] ? new Date(right[key]).getTime() : 0)) * modifier; return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier; }
function levelTone(level: string): Tone { return ({ INFO: "blue", SUCCESS: "emerald", WARNING: "amber", DANGER: "red" } as Record<string, Tone>)[level] || "slate"; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viLevel(level: string) { return ({ INFO: "Thông tin", SUCCESS: "Hoàn tất", WARNING: "Cảnh báo", DANGER: "Khẩn cấp" } as Record<string, string>)[level] || level; }
