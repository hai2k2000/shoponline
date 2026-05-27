"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type PartyOption = { id: string; name: string; phone: string | null };
type DebtRow = { id: string; type: string; partyName: string; amount: number; paidAmount: number; status: string; dueDate: string | null; note: string | null; createdAt: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: DebtRow } | { mode: "pay"; row: DebtRow } | { mode: "detail"; row: DebtRow } | null;
type SortKey = "createdAt" | "partyName" | "type" | "amount" | "remaining" | "dueDate" | "status";

const statuses = ["OPEN", "PARTIAL", "PAID", "OVERDUE", "CLOSED"];
const pageSize = 12;

export function DebtsClient({ rows, customers, suppliers, sessionToken }: { rows: DebtRow[]; customers: PartyOption[]; suppliers: PartyOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => (!term || [row.partyName, row.note || ""].some((value) => value.toLowerCase().includes(term))) && (!type || row.type === type) && (!status || row.status === status))
      .sort((left, right) => compareDebts(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const receivable = rows.filter((row) => row.type === "CUSTOMER" && ["OPEN", "PARTIAL", "OVERDUE"].includes(row.status)).reduce((sum, row) => sum + remaining(row), 0);
  const payable = rows.filter((row) => row.type === "SUPPLIER" && ["OPEN", "PARTIAL", "OVERDUE"].includes(row.status)).reduce((sum, row) => sum + remaining(row), 0);
  const overdue = rows.filter((row) => row.status === "OVERDUE").length;

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Tài chính / Công nợ" title="Quản lý công nợ" description="Theo dõi phải thu khách hàng, phải trả nhà cung cấp, hạn thanh toán và ghi nhận thanh toán từng phần." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo công nợ</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng khoản" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Phải thu" value={money(receivable)} tone={receivable ? "emerald" : "slate"} hint="Khách hàng còn phải trả" />
        <StatCard label="Phải trả" value={money(payable)} tone={payable ? "amber" : "slate"} hint="Còn phải trả nhà cung cấp" />
        <StatCard label="Quá hạn" value={overdue} tone={overdue ? "red" : "slate"} hint="Cần xử lý sớm" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} khoản`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên khách/nhà cung cấp, ghi chú" />
        <SelectField label="Loại" value={type} onChange={(value) => { setType(value); resetPage(); }}><option value="">Tất cả</option><option value="CUSTOMER">Phải thu</option><option value="SUPPLIER">Phải trả</option></SelectField>
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viDebtStatus(item)}</option>)}</SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><SortableTh label="Đối tượng" active={sortKey === "partyName"} direction={sortDirection} onClick={() => toggleSort("partyName", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Loại" active={sortKey === "type"} direction={sortDirection} onClick={() => toggleSort("type", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Số tiền" active={sortKey === "amount"} direction={sortDirection} onClick={() => toggleSort("amount", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 font-semibold">Đã trả</th><SortableTh label="Còn lại" active={sortKey === "remaining"} direction={sortDirection} onClick={() => toggleSort("remaining", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Hạn" active={sortKey === "dueDate"} direction={sortDirection} onClick={() => toggleSort("dueDate", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} /><th className="px-4 py-3 text-right font-semibold">Thao tác</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3"><strong>{row.partyName}</strong><p className="mt-1 max-w-64 truncate text-xs text-slate-500">{row.note || "Không có ghi chú"}</p></td><td className="px-4 py-3">{viDebtType(row.type)}</td><td className="px-4 py-3">{money(row.amount)}</td><td className="px-4 py-3">{money(row.paidAmount)}</td><td className="px-4 py-3 font-semibold">{money(remaining(row))}</td><td className="px-4 py-3">{row.dueDate ? dateText(row.dueDate) : "-"}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viDebtStatus(row.status)}</StatusBadge></td><td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button><Button variant="outline" onClick={() => setModal({ mode: "edit", row })}>Sửa</Button>{!["PAID", "CLOSED"].includes(row.status) ? <Button variant="outline" onClick={() => setModal({ mode: "pay", row })}>Thanh toán</Button> : null}{row.status !== "CLOSED" ? <CloseButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}</tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có công nợ phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo khoản công nợ mới từ nút Tạo công nợ." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "create" || modal?.mode === "edit" ? <DebtModal modal={modal} customers={customers} suppliers={suppliers} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "pay" ? <PaymentModal row={modal.row} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "detail" ? <DebtDetail row={modal.row} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function DebtModal({ modal, customers, suppliers, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: DebtRow }>; customers: PartyOption[]; suppliers: PartyOption[]; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  const [type, setType] = useState(row?.type || "CUSTOMER");
  return <ModalShell title={row ? "Sửa công nợ" : "Tạo công nợ"} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="debt-form">Lưu</button></>}><form id="debt-form" action="/api/admin/debts" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} />{row ? <input type="hidden" name="id" value={row.id} /> : null}{!row ? <Field label="Loại"><select className={inputClass} name="type" value={type} onChange={(event) => setType(event.target.value)}><option value="CUSTOMER">Phải thu khách hàng</option><option value="SUPPLIER">Phải trả nhà cung cấp</option></select></Field> : null}{!row && type === "CUSTOMER" ? <Field label="Khách hàng"><select required className={inputClass} name="customerId">{customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></Field> : null}{!row && type === "SUPPLIER" ? <Field label="Nhà cung cấp"><select required className={inputClass} name="supplierId">{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></Field> : null}{row ? <Info label="Đối tượng" value={row.partyName} /> : null}<Field label="Số tiền"><input required className={inputClass} name="amount" type="number" min={1} defaultValue={row?.amount || 0} /></Field><Field label="Đã thanh toán"><input className={inputClass} name="paidAmount" type="number" min={0} defaultValue={row?.paidAmount || 0} /></Field><Field label="Hạn thanh toán"><input className={inputClass} name="dueDate" type="date" defaultValue={row?.dueDate?.slice(0, 10) || ""} /></Field>{row ? <Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row.status}>{statuses.map((item) => <option key={item} value={item}>{viDebtStatus(item)}</option>)}</select></Field> : null}<Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={4} defaultValue={row?.note || ""} /></Field></form></ModalShell>;
}
function PaymentModal({ row, sessionToken, onClose }: { row: DebtRow; sessionToken: string; onClose: () => void }) { return <ModalShell title="Ghi nhận thanh toán" onClose={onClose} width="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit" form="debt-payment-form">Lưu</button></>}><form id="debt-payment-form" action="/api/admin/debts/payment" method="post" className="grid gap-3"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><Info label="Còn lại" value={money(remaining(row))} /><Field label="Số tiền thanh toán"><input required className={inputClass} name="payment" type="number" min={1} max={Math.max(1, remaining(row))} /></Field></form></ModalShell>; }
function CloseButton({ row, sessionToken }: { row: DebtRow; sessionToken: string }) { return <form action="/api/admin/debts/close" method="post" onSubmit={(event) => { if (!confirm("Đóng khoản công nợ này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Đóng</button></form>; }
function DebtDetail({ row, onClose }: { row: DebtRow; onClose: () => void }) { return <ModalShell title={row.partyName} onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="Loại" value={viDebtType(row.type)} /><Info label="Trạng thái" value={viDebtStatus(row.status)} /><Info label="Số tiền" value={money(row.amount)} /><Info label="Đã trả" value={money(row.paidAmount)} /><Info label="Còn lại" value={money(remaining(row))} /><Info label="Hạn thanh toán" value={row.dueDate ? dateText(row.dueDate) : "-"} /><Info label="Ghi chú" value={row.note || "-"} wide /></div></ModalShell>; }
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>; }
function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) { return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) { resetPage(); if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(["createdAt", "amount", "remaining", "dueDate"].includes(nextKey) ? "desc" : "asc"); } }
function compareDebts(left: DebtRow, right: DebtRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt") return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier; if (key === "dueDate") return ((left.dueDate ? new Date(left.dueDate).getTime() : 0) - (right.dueDate ? new Date(right.dueDate).getTime() : 0)) * modifier; if (key === "amount") return (left.amount - right.amount) * modifier; if (key === "remaining") return (remaining(left) - remaining(right)) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function remaining(row: DebtRow) { return Math.max(0, row.amount - row.paidAmount); }
function statusTone(status: string): Tone { return ({ OPEN: "amber", PARTIAL: "blue", PAID: "emerald", OVERDUE: "red", CLOSED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viDebtType(type: string) { return type === "CUSTOMER" ? "Phải thu" : "Phải trả"; }
function viDebtStatus(status: string) { return ({ OPEN: "Mở", PARTIAL: "Thanh toán một phần", PAID: "Đã thanh toán", OVERDUE: "Quá hạn", CLOSED: "Đã đóng" } as Record<string, string>)[status] || status; }
