"use client";

import { useMemo, useState } from "react";
import { createPaymentAction } from "./actions";

type OrderOption = { id: string; orderCode: string; customer: string; total: number; paid: number; remaining: number; paymentStatus: string };
type PaymentRow = { id: string; orderCode: string; customer: string; amount: number; method: string; reference: string | null; note: string | null; receivedBy: string | null; createdAt: string };

const methods = ["CASH", "BANK_TRANSFER", "COD", "MOMO", "OTHER"];

export function PaymentsClient({ orders, payments }: { orders: OrderOption[]; payments: PaymentRow[] }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return payments.filter((row) => !term || [row.orderCode, row.customer, row.method, row.reference || "", row.note || ""].some((value) => value.toLowerCase().includes(term)));
  }, [payments, query]);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-700">Admin / Tài chính</p><h1 className="text-3xl font-semibold">Giao dịch thanh toán</h1><p className="mt-1 text-sm text-slate-600">Ghi nhận từng lần thu tiền và tự cập nhật trạng thái thanh toán của đơn hàng.</p></div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>Ghi nhận thanh toán</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng giao dịch" value={payments.length} />
          <Metric label="Đã thu" value={money(totalPaid)} />
          <Metric label="Còn phải thu" value={money(totalRemaining)} />
          <Metric label="Đơn còn nợ" value={orders.filter((order) => order.remaining > 0).length} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã đơn, khách hàng, phương thức, mã tham chiếu" /></label>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Phương thức</th><th className="px-4 py-3">Tham chiếu</th><th className="px-4 py-3">Người thu</th><th className="px-4 py-3">Ngày</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{row.orderCode}<p className="text-xs text-slate-500">{row.note || ""}</p></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3 font-semibold">{money(row.amount)}</td><td className="px-4 py-3">{viMethod(row.method)}</td><td className="px-4 py-3">{row.reference || "-"}</td><td className="px-4 py-3">{row.receivedBy || "-"}</td><td className="px-4 py-3">{dateText(row.createdAt)}</td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Chưa có giao dịch phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
      {modalOpen ? <PaymentModal orders={orders.filter((order) => order.remaining > 0)} onClose={() => setModalOpen(false)} /> : null}
    </main>
  );
}

function PaymentModal({ orders, onClose }: { orders: OrderOption[]; onClose: () => void }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const order = orders.find((item) => item.id === orderId);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action={createPaymentAction} className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Ghi nhận thanh toán</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Đơn hàng<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="orderId" value={orderId} onChange={(event) => setOrderId(event.target.value)}>{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - còn {money(item.remaining)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Số tiền<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="amount" type="number" min={1} max={Math.max(1, order?.remaining || 1)} defaultValue={order?.remaining || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Phương thức<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="method">{methods.map((item) => <option key={item} value={item}>{viMethod(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã tham chiếu<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="reference" placeholder="Mã ngân hàng, COD..." /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={!orders.length}>Lưu thanh toán</button></div>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viMethod(value: string) { return ({ CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", COD: "COD", MOMO: "MoMo", OTHER: "Khác" } as Record<string, string>)[value] || value; }
