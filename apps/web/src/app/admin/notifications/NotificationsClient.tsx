"use client";

import { useMemo, useState } from "react";

type NotificationRow = { id: string; level: string; title: string; message: string | null; entityType: string | null; entityId: string | null; readAt: string | null; createdAt: string };

export function NotificationsClient({ rows, sessionToken }: { rows: NotificationRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.title, row.message || "", row.entityType || ""].some((value) => value.toLowerCase().includes(term));
      const matchesMode = !mode || (mode === "unread" ? !row.readAt : row.readAt);
      return matchesTerm && matchesMode;
    });
  }, [mode, query, rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Hệ thống</p>
            <h1 className="text-3xl font-semibold">Thông báo</h1>
            <p className="mt-1 text-sm text-slate-600">Theo dõi các cảnh báo và sự kiện nghiệp vụ cần xử lý.</p>
          </div>
          <form action="/api/admin/notifications/read-all" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Đánh dấu đã đọc</button></form>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng thông báo" value={rows.length} />
          <Metric label="Chưa đọc" value={rows.filter((row) => !row.readAt).length} />
          <Metric label="Cảnh báo" value={rows.filter((row) => ["WARNING", "DANGER"].includes(row.level)).length} />
          <Metric label="Hôm nay" value={rows.filter((row) => new Date(row.createdAt).toDateString() === new Date().toDateString()).length} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tiêu đề, nội dung, nghiệp vụ" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={mode} onChange={(event) => setMode(event.target.value)}><option value="">Tất cả</option><option value="unread">Chưa đọc</option><option value="read">Đã đọc</option></select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="grid gap-3">
          {filtered.map((row) => (
            <article key={row.id} className={`rounded-xl border bg-white p-4 shadow-sm ${row.readAt ? "border-slate-200" : "border-emerald-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${levelClass(row.level)}`}>{viLevel(row.level)}</span><h2 className="mt-2 text-lg font-semibold">{row.title}</h2>{row.message ? <p className="mt-1 text-sm text-slate-600">{row.message}</p> : null}</div>
                <span className="text-sm text-slate-500">{dateText(row.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <span>{row.entityType || "Hệ thống"}</span>
                {!row.readAt ? <form action="/api/admin/notifications/read" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700" type="submit">Đã đọc</button></form> : <span>Đã đọc {dateText(row.readAt)}</span>}
              </div>
            </article>
          ))}
          {!filtered.length ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Chưa có thông báo phù hợp.</div> : null}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viLevel(level: string) { return ({ INFO: "Thông tin", SUCCESS: "Hoàn tất", WARNING: "Cảnh báo", DANGER: "Khẩn cấp" } as Record<string, string>)[level] || level; }
function levelClass(level: string) { return ({ INFO: "bg-sky-50 text-sky-700", SUCCESS: "bg-emerald-50 text-emerald-700", WARNING: "bg-amber-50 text-amber-700", DANGER: "bg-red-50 text-red-700" } as Record<string, string>)[level] || "bg-slate-100 text-slate-700"; }
