"use client";

import { useMemo, useState } from "react";

type AuditRow = { id: string; user: string | null; action: string; entityType: string; entityId: string | null; description: string | null; createdAt: string };

export function AuditClient({ rows }: { rows: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("");
  const entityTypes = Array.from(new Set(rows.map((row) => row.entityType))).sort();
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.user || "", row.action, row.entityType, row.entityId || "", row.description || ""].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (!entityType || row.entityType === entityType);
    });
  }, [entityType, query, rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">Admin / Hệ thống</p>
          <h1 className="text-3xl font-semibold">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi thao tác quan trọng: đăng nhập, tạo đơn, nhập kho, thanh toán, hoàn tiền và thay đổi trạng thái.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng log" value={rows.length} />
          <Metric label="Hôm nay" value={rows.filter((row) => new Date(row.createdAt).toDateString() === new Date().toDateString()).length} />
          <Metric label="Người dùng" value={new Set(rows.map((row) => row.user).filter(Boolean)).size} />
          <Metric label="Loại nghiệp vụ" value={entityTypes.length} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_240px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Người dùng, hành động, mô tả" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Nghiệp vụ<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={entityType} onChange={(event) => setEntityType(event.target.value)}><option value="">Tất cả</option>{entityTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Người dùng</th><th className="px-4 py-3">Hành động</th><th className="px-4 py-3">Nghiệp vụ</th><th className="px-4 py-3">Mô tả</th><th className="px-4 py-3">ID</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{dateText(row.createdAt)}</td><td className="px-4 py-3">{row.user || "Hệ thống"}</td><td className="px-4 py-3 font-semibold">{row.action}</td><td className="px-4 py-3">{row.entityType}</td><td className="px-4 py-3">{row.description || "-"}</td><td className="px-4 py-3 text-xs text-slate-500">{row.entityId || "-"}</td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>Chưa có log phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)); }
