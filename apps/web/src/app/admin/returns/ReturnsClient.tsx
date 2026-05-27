"use client";

import { useMemo, useState } from "react";

type OrderOption = { id: string; orderCode: string; customer: string; total: number; paid: number; orderStatus: string };
type ReturnRow = {
  id: string;
  code: string;
  orderCode: string;
  customer: string;
  status: string;
  reason: string;
  refundAmount: number;
  receivedAt: string | null;
  refundedAt: string | null;
  note: string | null;
  createdAt: string;
};

const reasons = ["Khách đổi ý", "Sản phẩm lỗi", "Giao sai hàng", "Giao chậm", "Khác"];

export function ReturnsClient({ rows, orders, sessionToken }: { rows: ReturnRow[]; orders: OrderOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => !term || [row.code, row.orderCode, row.customer, row.reason, row.note || ""].some((value) => value.toLowerCase().includes(term)));
  }, [query, rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Đơn hàng</p>
            <h1 className="text-3xl font-semibold">Trả hàng và hoàn tiền</h1>
            <p className="mt-1 text-sm text-slate-600">Quản lý yêu cầu trả hàng, nhận hàng hoàn kho và ghi nhận hoàn tiền.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>Tạo yêu cầu</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng yêu cầu" value={rows.length} />
          <Metric label="Đang xử lý" value={rows.filter((row) => ["REQUESTED", "APPROVED"].includes(row.status)).length} />
          <Metric label="Đã nhận hàng" value={rows.filter((row) => row.status === "RECEIVED").length} />
          <Metric label="Đã hoàn tiền" value={money(rows.filter((row) => row.status === "REFUNDED").reduce((sum, row) => sum + row.refundAmount, 0))} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã trả hàng, mã đơn, khách hàng, lý do" /></label>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã yêu cầu</th><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Lý do</th><th className="px-4 py-3">Hoàn tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{row.code}</strong><p className="text-xs text-slate-500">{dateText(row.createdAt)}</p></td><td className="px-4 py-3">{row.orderCode}<p className="text-xs text-slate-500">{row.note || ""}</p></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{row.reason}</td><td className="px-4 py-3 font-semibold">{money(row.refundAmount)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td><td className="px-4 py-3"><ReturnActions row={row} sessionToken={sessionToken} /></td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Chưa có yêu cầu phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
      {modalOpen ? <ReturnModal orders={orders} sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </main>
  );
}

function ReturnModal({ orders, sessionToken, onClose }: { orders: OrderOption[]; sessionToken: string; onClose: () => void }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const order = orders.find((item) => item.id === orderId);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/returns" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Tạo yêu cầu trả hàng</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Đơn hàng<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - {money(item.total)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Lý do<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="reason">{reasons.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Số tiền hoàn<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="refundAmount" type="number" min={0} max={Math.max(0, order?.paid || order?.total || 0)} defaultValue={order?.paid || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white" disabled={!orders.length}>Lưu yêu cầu</button></div>
      </form>
    </div>
  );
}

function ReturnActions({ row, sessionToken }: { row: ReturnRow; sessionToken: string }) {
  const next = row.status === "REQUESTED" ? [["APPROVED", "Duyệt"], ["REJECTED", "Từ chối"]] : row.status === "APPROVED" ? [["RECEIVED", "Nhận hàng"]] : row.status === "RECEIVED" ? [["REFUNDED", "Hoàn tiền"]] : [];
  return <div className="flex flex-wrap justify-end gap-2">{next.map(([status, label]) => <form key={status} action="/api/admin/returns/status" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={status} /><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" type="submit">{label}</button></form>)}</div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ REQUESTED: "Đã yêu cầu", APPROVED: "Đã duyệt", RECEIVED: "Đã nhận hàng", REFUNDED: "Đã hoàn tiền", REJECTED: "Từ chối" } as Record<string, string>)[status] || status; }
