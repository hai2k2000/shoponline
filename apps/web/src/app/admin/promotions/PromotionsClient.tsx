"use client";

import { useMemo, useState } from "react";

type PromotionRow = { id: string; code: string; name: string; discountType: string; discountValue: number; minOrder: number; maxDiscount: number | null; usageLimit: number | null; usedCount: number; status: string; startsAt: string | null; endsAt: string | null };

export function PromotionsClient({ rows, sessionToken }: { rows: PromotionRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => !term || [row.code, row.name, row.status].some((value) => value.toLowerCase().includes(term)));
  }, [query, rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-700">Admin / Bán hàng</p><h1 className="text-3xl font-semibold">Khuyến mãi</h1><p className="mt-1 text-sm text-slate-600">Tạo và quản lý mã giảm giá áp dụng ở checkout.</p></div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>Tạo mã</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng mã" value={rows.length} />
          <Metric label="Đang bật" value={rows.filter((row) => row.status === "ACTIVE").length} />
          <Metric label="Lượt dùng" value={rows.reduce((sum, row) => sum + row.usedCount, 0)} />
          <Metric label="Có giới hạn" value={rows.filter((row) => row.usageLimit != null).length} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tên chương trình" /></label></section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Giảm</th><th className="px-4 py-3">Đơn tối thiểu</th><th className="px-4 py-3">Lượt dùng</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.code}</td><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.discountType === "PERCENT" ? `${row.discountValue}%` : money(row.discountValue)}{row.maxDiscount ? <p className="text-xs text-slate-500">Tối đa {money(row.maxDiscount)}</p> : null}</td><td className="px-4 py-3">{money(row.minOrder)}</td><td className="px-4 py-3">{row.usedCount}{row.usageLimit ? ` / ${row.usageLimit}` : ""}</td><td className="px-4 py-3">{viStatus(row.status)}</td><td className="px-4 py-3"><form className="flex justify-end" action="/api/admin/promotions/toggle" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" type="submit">{row.status === "ACTIVE" ? "Tắt" : "Bật"}</button></form></td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Chưa có mã phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
      {modalOpen ? <PromotionModal sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </main>
  );
}

function PromotionModal({ sessionToken, onClose }: { sessionToken: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/promotions" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Tạo mã giảm giá</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal uppercase" name="code" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên chương trình<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="name" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Loại giảm<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="discountType"><option value="FIXED">Số tiền</option><option value="PERCENT">Phần trăm</option></select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá trị<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="discountValue" type="number" min={1} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Đơn tối thiểu<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="minOrder" type="number" min={0} defaultValue={0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giảm tối đa<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="maxDiscount" type="number" min={0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giới hạn lượt<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="usageLimit" type="number" min={1} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Ngày hết hạn<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="endsAt" type="date" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white" type="submit">Lưu mã</button></div>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function viStatus(status: string) { return ({ ACTIVE: "Đang bật", DRAFT: "Nháp", HIDDEN: "Đã tắt", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status; }
