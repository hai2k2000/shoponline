"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { checkoutAction } from "./actions";

type CartItem = { id: string; name: string; sku: string; price: number; quantity: number };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { setItems(JSON.parse(localStorage.getItem("shoponline.cart") || "[]")); }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  if (result) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-950"><section className="grid max-w-md gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"><h1 className="text-2xl font-semibold">Đặt hàng thành công</h1><p>Mã đơn của bạn là <strong>{result}</strong></p><Link className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white" href={`/tracking?code=${result}`}>Theo dõi đơn</Link></section></main>;
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); formData.set("cart", JSON.stringify(items.map((item) => ({ id: item.id, quantity: item.quantity })))); startTransition(async () => { setError(""); const response = await checkoutAction(formData); if (response.ok && response.orderCode) { localStorage.removeItem("shoponline.cart"); setResult(response.orderCode); } else setError(response.error || "Không thể đặt hàng."); }); }} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-sm font-semibold text-emerald-700">Cửa hàng</p><h1 className="text-3xl font-semibold">Thanh toán</h1></div>
          <input type="hidden" name="cart" />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Họ tên<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="name" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Số điện thoại<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="phone" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Email<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="email" type="email" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã giảm giá<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal uppercase" name="couponCode" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="SALE2026" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Địa chỉ<textarea required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="address" rows={3} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending || !items.length}>{pending ? "Đang đặt..." : "Đặt hàng"}</button>
        </form>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Đơn hàng</h2><div className="mt-3 grid gap-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.name} x{item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="mt-4 flex justify-between border-t border-slate-100 pt-4"><span>Tạm tính</span><strong>{money(total)}</strong></div></aside>
      </div>
    </main>
  );
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
