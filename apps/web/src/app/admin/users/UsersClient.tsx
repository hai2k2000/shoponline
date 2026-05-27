"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";

type UserRow = { id: string; name: string; email: string; role: string; status: string; createdAt: string; updatedAt: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: UserRow } | { mode: "password"; row: UserRow } | null;
type SortKey = "name" | "email" | "role" | "status" | "createdAt" | "updatedAt";

const roles = ["ADMIN", "MANAGER", "SALES", "WAREHOUSE", "ACCOUNTANT", "MARKETING"];
const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function UsersClient({ rows, currentUserId, sessionToken }: { rows: UserRow[]; currentUserId: string; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => (!term || [row.name, row.email].some((value) => value.toLowerCase().includes(term))) && (!role || row.role === role) && (!status || row.status === status))
      .sort((left, right) => compareUsers(left, right, sortKey, sortDirection));
  }, [query, role, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const adminCount = rows.filter((row) => row.role === "ADMIN").length;
  const archivedCount = rows.filter((row) => row.status === "ARCHIVED").length;
  const lockedCount = rows.filter((row) => row.status === "HIDDEN").length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Người dùng" title="Quản lý người dùng" description="Tạo tài khoản, phân vai trò, khóa tài khoản và reset mật khẩu theo đúng phân quyền vận hành." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo người dùng</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng user" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đang hoạt động" value={activeCount} tone="emerald" hint="Có thể đăng nhập" />
        <StatCard label="Quản trị" value={adminCount} tone={adminCount ? "blue" : "slate"} hint="Toàn quyền hệ thống" />
        <StatCard label="Khóa/lưu trữ" value={lockedCount + archivedCount} tone={lockedCount + archivedCount ? "red" : "slate"} hint={`${archivedCount} đã lưu trữ`} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} người dùng`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên hoặc email" />
        <SelectField label="Vai trò" value={role} onChange={(value) => { setRole(value); resetPage(); }}><option value="">Tất cả</option>{roles.map((item) => <option key={item} value={item}>{viRole(item)}</option>)}</SelectField>
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Người dùng" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Email" active={sortKey === "email"} direction={sortDirection} onClick={() => toggleSort("email", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Vai trò" active={sortKey === "role"} direction={sortDirection} onClick={() => toggleSort("role", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Ngày tạo" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.name}</strong>{row.id === currentUserId ? <p className="mt-1 text-xs font-semibold text-emerald-700">Tài khoản hiện tại</p> : null}</td><td className="px-4 py-3 text-slate-600">{row.email}</td><td className="px-4 py-3">{viRole(row.role)}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td><td className="px-4 py-3">{dateText(row.createdAt)}</td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "edit", row })}>Sửa</Button><Button variant="outline" onClick={() => setModal({ mode: "password", row })}>Reset mật khẩu</Button>{row.status !== "ARCHIVED" && row.id !== currentUserId ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có người dùng phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo tài khoản mới từ nút Tạo người dùng." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>
      {modal?.mode === "create" || modal?.mode === "edit" ? <UserModal modal={modal} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "password" ? <PasswordModal row={modal.row} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function UserModal({ modal, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: UserRow }>; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return <ModalShell title={row ? "Sửa người dùng" : "Tạo người dùng"} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="user-form">Lưu</button></>}><form id="user-form" action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} />{row ? <input type="hidden" name="id" value={row.id} /> : null}<Field label="Tên"><input required className={inputClass} name="name" defaultValue={row?.name || ""} /></Field><Field label="Email"><input required className={inputClass} name="email" type="email" defaultValue={row?.email || ""} /></Field>{!row ? <Field label="Mật khẩu"><input required className={inputClass} name="password" type="password" minLength={6} defaultValue="ShopOnline@2026" /></Field> : null}<Field label="Vai trò"><select className={inputClass} name="role" defaultValue={row?.role || "SALES"}>{roles.map((item) => <option key={item} value={item}>{viRole(item)}</option>)}</select></Field><Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field></form></ModalShell>;
}
function PasswordModal({ row, sessionToken, onClose }: { row: UserRow; sessionToken: string; onClose: () => void }) { return <ModalShell title="Reset mật khẩu" onClose={onClose} width="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="password-form">Reset</button></>}><form id="password-form" action="/api/admin/users/reset-password" method="post" className="grid gap-3"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><div className="rounded-lg bg-slate-50 p-3 text-sm"><strong className="block text-slate-950">{row.name}</strong><span className="text-slate-500">{row.email}</span></div><Field label="Mật khẩu mới"><input required className={inputClass} name="password" type="password" minLength={6} defaultValue="ShopOnline@2026" /></Field></form></ModalShell>; }
function ArchiveButton({ row, sessionToken }: { row: UserRow; sessionToken: string }) { return <form action="/api/admin/users/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ người dùng này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Lưu trữ</button></form>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["createdAt", "updatedAt"].includes(nextKey) ? "desc" : "asc"); } }
function compareUsers(left: UserRow, right: UserRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt" || key === "updatedAt") return (new Date(left[key]).getTime() - new Date(right[key]).getTime()) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function statusTone(status: string): Tone { return ({ ACTIVE: "emerald", DRAFT: "amber", HIDDEN: "red", ARCHIVED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viRole(role: string) { return ({ ADMIN: "Quản trị", MANAGER: "Quản lý", SALES: "Bán hàng", WAREHOUSE: "Kho", ACCOUNTANT: "Kế toán", MARKETING: "Marketing" } as Record<string, string>)[role] || role; }
function viStatus(status: string) { return ({ ACTIVE: "Đang hoạt động", DRAFT: "Nháp", HIDDEN: "Khoá", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
