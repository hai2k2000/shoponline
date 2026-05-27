"use client";

import { useMemo, useState } from "react";

type CustomerOption = { id: string; name: string; phone: string | null };
type TimelineRow = { id: string; customer: string; type: string; title: string; note: string | null; createdBy: string | null; createdAt: string };

const types = ["NOTE", "CALL", "MESSAGE", "SUPPORT"];

export function CustomerTimelineClient({ rows, customers, sessionToken }: { rows: TimelineRow[]; customers: CustomerOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => !term || [row.customer, row.title, row.note || "", row.type].some((value) => value.toLowerCase().includes(term)));
  }, [query, rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Khách hàng</p>
            <h1 className="text-3xl font-semibold">Lịch sử chăm sóc khách hàng</h1>
            <p className="mt-1 text-sm text-slate-600">Lưu cuộc gọi, tin nhắn, ghi chú hỗ trợ và sự kiện đơn hàng theo khách.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>Thêm ghi chú</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng tương tác" value={rows.length} />
          <Metric label="Cuộc gọi" value={rows.filter((row) => row.type === "CALL").length} />
          <Metric label="Tin nhắn" value={rows.filter((row) => row.type === "MESSAGE").length} />
          <Metric label="Đơn hàng" value={rows.filter((row) => row.type === "ORDER").length} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Khách hàng, tiêu đề, ghi chú" /></label>
        </section>

        <section className="grid gap-3">
          {filtered.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viType(row.type)}</span><h2 className="mt-2 text-lg font-semibold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{row.customer}</p>{row.note ? <p className="mt-2 text-sm text-slate-700">{row.note}</p> : null}</div><span className="text-sm text-slate-500">{dateText(row.createdAt)}</span></div></article>)}
          {!filtered.length ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Chưa có lịch sử phù hợp.</div> : null}
        </section>
      </div>
      {modalOpen ? <TimelineModal customers={customers} sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </main>
  );
}

function TimelineModal({ customers, sessionToken, onClose }: { customers: CustomerOption[]; sessionToken: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/customers/timeline" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Thêm lịch sử CSKH</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Khách hàng<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="customerId">{customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Loại<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="type">{types.map((item) => <option key={item} value={item}>{viType(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Tiêu đề<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="title" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={4} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white" type="submit">Lưu</button></div>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viType(type: string) { return ({ NOTE: "Ghi chú", CALL: "Cuộc gọi", MESSAGE: "Tin nhắn", ORDER: "Đơn hàng", SUPPORT: "Hỗ trợ" } as Record<string, string>)[type] || type; }
