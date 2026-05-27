"use client";

import { useMemo, useState } from "react";

type ExpenseRow = { id: string; category: string; title: string; amount: number; note: string | null; status: string; createdAt: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: ExpenseRow } | { mode: "detail"; row: ExpenseRow } | null;
const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];

export function ExpensesClient({ rows, sessionToken }: { rows: ExpenseRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category))).sort(), [rows]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => (!term || [row.title, row.category, row.note || ""].some((value) => value.toLowerCase().includes(term))) && (!category || row.category === category) && (!status || row.status === status));
  }, [category, query, rows, status]);
  const activeTotal = rows.filter((row) => row.status === "ACTIVE").reduce((sum, row) => sum + row.amount, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-700">Admin / Tài chính</p><h1 className="text-3xl font-semibold">Quản lý chi phí</h1><p className="mt-1 text-sm text-slate-600">Theo dõi chi phí vận hành, marketing, nhập hàng và chi phí khác.</p></div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "create" })}>Tạo chi phí</button>
        </header>
        <section className="grid gap-4 md:grid-cols-4"><Metric label="Tổng dòng" value={rows.length} /><Metric label="Đang tính" value={rows.filter((row) => row.status === "ACTIVE").length} /><Metric label="Tổng chi phí" value={money(activeTotal)} /><Metric label="Danh mục" value={categories.length} /></section>
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên chi phí, danh mục, ghi chú" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tất cả</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Chi phí</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{row.title}</strong><p className="mt-1 text-xs text-slate-500">{row.note || ""}</p></td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3 font-semibold">{money(row.amount)}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "detail", row })}>Xem</button><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "edit", row })}>Sửa</button>{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>Không có chi phí phù hợp.</td></tr> : null}</tbody></table></div></section>
      </div>
      {modal?.mode === "detail" ? <ExpenseDetail row={modal.row} onClose={() => setModal(null)} /> : modal ? <ExpenseModal modal={modal} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function ExpenseModal({ modal, sessionToken, onClose }: { modal: Exclude<ModalState, null | { mode: "detail"; row: ExpenseRow }>; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form action="/api/admin/expenses" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="mode" value={row ? "update" : "create"} /><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">{row ? "Sửa chi phí" : "Tạo chi phí"}</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>{row ? <input type="hidden" name="id" value={row.id} /> : null}<div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold text-slate-700">Tên chi phí<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="title" defaultValue={row?.title || ""} /></label><label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="category" defaultValue={row?.category || ""} placeholder="Marketing, Vận hành..." /></label><label className="grid gap-1 text-sm font-semibold text-slate-700">Số tiền<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="amount" type="number" min={1} defaultValue={row?.amount || 0} /></label><label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={4} defaultValue={row?.note || ""} /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Lưu</button></div></form></div>;
}
function ArchiveButton({ row, sessionToken }: { row: ExpenseRow; sessionToken: string }) { return <form action="/api/admin/expenses/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ chi phí này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700">Lưu trữ</button></form>; }
function ExpenseDetail({ row, onClose }: { row: ExpenseRow; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><section className="grid w-full max-w-xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">{row.title}</h2><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div><div className="grid gap-3 md:grid-cols-2"><Info label="Danh mục" value={row.category} /><Info label="Số tiền" value={money(row.amount)} /><Info label="Ngày tạo" value={dateText(row.createdAt)} /><Info label="Trạng thái" value={viStatus(row.status)} /><Info label="Ghi chú" value={row.note || "-"} wide /></div></section></div>; }
function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-xl bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ ACTIVE: "Đang tính", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
