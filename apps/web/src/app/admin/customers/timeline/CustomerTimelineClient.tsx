"use client";

import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { AdminPage, Button, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type CustomerOption = { id: string; name: string; phone: string | null };
type TimelineRow = { id: string; customer: string; type: string; title: string; note: string | null; createdBy: string | null; createdAt: string };
type ModalState = { mode: "create" } | { mode: "detail"; row: TimelineRow } | null;

const types = ["NOTE", "CALL", "MESSAGE", "SUPPORT"];
const pageSize = 12;

export function CustomerTimelineClient({ rows, customers, sessionToken }: { rows: TimelineRow[]; customers: CustomerOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => (!term || [row.customer, row.title, row.note || "", row.type, row.createdBy || ""].some((value) => value.toLowerCase().includes(term))) && (!type || row.type === type));
  }, [query, rows, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetPage() { setPage(1); }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Khách hàng / CSKH" title="Lịch sử chăm sóc khách hàng" description="Lưu cuộc gọi, tin nhắn, ghi chú hỗ trợ và sự kiện theo từng khách hàng để đội bán hàng nắm toàn bộ ngữ cảnh." action={<div className="flex flex-wrap justify-end gap-2"><a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50" href={`/api/admin/customers/timeline/export?${exportParams(query, type)}`}><Download className="mr-2 size-4" />CSV</a><Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo ghi chú</Button></div>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng tương tác" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Cuộc gọi" value={rows.filter((row) => row.type === "CALL").length} tone="blue" hint="Liên hệ trực tiếp" />
        <StatCard label="Tin nhắn" value={rows.filter((row) => row.type === "MESSAGE").length} tone="emerald" hint="Trao đổi qua kênh chat" />
        <StatCard label="Hỗ trợ" value={rows.filter((row) => row.type === "SUPPORT").length} tone="amber" hint="Cần theo dõi xử lý" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} tương tác`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Khách hàng, tiêu đề, ghi chú" />
        <SelectField label="Loại" value={type} onChange={(value) => { setType(value); resetPage(); }}><option value="">Tất cả</option>{types.map((item) => <option key={item} value={item}>{viType(item)}</option>)}</SelectField>
      </FilterBar>

      <section className="grid gap-3">
        {visibleRows.map((row) => <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><StatusBadge tone={typeTone(row.type)}>{viType(row.type)}</StatusBadge><h2 className="mt-2 text-lg font-semibold text-slate-950">{row.title}</h2><p className="mt-1 text-sm font-semibold text-slate-700">{row.customer}</p>{row.note ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{row.note}</p> : null}</div><div className="grid justify-items-end gap-2 text-right text-sm text-slate-500"><span>{dateText(row.createdAt)}</span>{row.createdBy ? <p>{row.createdBy}</p> : null}<Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button></div></div></article>)}
        {!visibleRows.length ? <div className="rounded-lg border border-slate-200 bg-white shadow-sm"><EmptyState title="Chưa có lịch sử phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo ghi chú chăm sóc mới." /></div> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </section>

      {modal?.mode === "create" ? <TimelineModal customers={customers} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "detail" ? <TimelineDetail row={modal.row} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function TimelineModal({ customers, sessionToken, onClose }: { customers: CustomerOption[]; sessionToken: string; onClose: () => void }) {
  return <ModalShell title="Tạo ghi chú CSKH" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Huỷ</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-55" type="submit" form="timeline-form" disabled={!customers.length}>Lưu</button></>}><form id="timeline-form" action="/api/admin/customers/timeline" method="post" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="sessionToken" value={sessionToken} />{!customers.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 md:col-span-2">Cần có khách hàng trước khi tạo lịch sử CSKH.</div> : null}<Field label="Khách hàng"><select required className={inputClass} name="customerId">{customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></Field><Field label="Loại"><select className={inputClass} name="type">{types.map((item) => <option key={item} value={item}>{viType(item)}</option>)}</select></Field><Field label="Tiêu đề" wide><input required className={inputClass} name="title" /></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={4} /></Field></form></ModalShell>;
}

function TimelineDetail({ row, onClose }: { row: TimelineRow; onClose: () => void }) { return <ModalShell title={row.title} onClose={onClose} width="max-w-2xl"><div className="grid gap-3 md:grid-cols-2"><Info label="Khách hàng" value={row.customer} /><Info label="Loại" value={viType(row.type)} /><Info label="Thời gian" value={dateText(row.createdAt)} /><Info label="Người tạo" value={row.createdBy || "-"} /><Info label="Ghi chú" value={row.note || "-"} wide /></div></ModalShell>; }
function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block break-words text-sm text-slate-900">{value}</strong></div>; }
function typeTone(type: string): Tone { return ({ NOTE: "slate", CALL: "blue", MESSAGE: "emerald", ORDER: "amber", SUPPORT: "red" } as Record<string, Tone>)[type] || "slate"; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viType(type: string) { return ({ NOTE: "Ghi chú", CALL: "Cuộc gọi", MESSAGE: "Tin nhắn", ORDER: "Đơn hàng", SUPPORT: "Hỗ trợ" } as Record<string, string>)[type] || type; }
function exportParams(query: string, type: string) { const params = new URLSearchParams(); if (query.trim()) params.set("search", query.trim()); if (type) params.set("type", type); return params.toString(); }
