"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItem = { id: string; name: string; sku: string; price: number; quantity: number };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { setItems(JSON.parse(localStorage.getItem("shoponline.cart") || "[]")); }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem("shoponline.cart", JSON.stringify(next)); };
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Cửa hàng</p><h1 className="text-3xl font-semibold">Giỏ hàng</h1></div><Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" href="/products">Tiếp tục mua</Link></header>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Đơn giá</th><th className="px-4 py-3">Số lượng</th><th className="px-4 py-3">Thành tiền</th><th className="px-4 py-3"></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.sku}</p></td><td className="px-4 py-3">{money(item.price)}</td><td className="px-4 py-3"><input className="w-24 rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} value={item.quantity} onChange={(event) => save(items.map((row) => row.id === item.id ? { ...row, quantity: Math.max(1, Number(event.target.value || 1)) } : row))} /></td><td className="px-4 py-3 font-semibold">{money(item.price * item.quantity)}</td><td className="px-4 py-3 text-right"><button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700" onClick={() => save(items.filter((row) => row.id !== item.id))}>Xóa</button></td></tr>)}{!items.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={5}>Giỏ hàng đang trống.</td></tr> : null}</tbody></table></section>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><span className="text-sm text-slate-500">Tổng tiền</span><strong className="mt-1 block text-2xl">{money(total)}</strong></div><Link className={`rounded-lg px-5 py-3 text-sm font-semibold text-white ${items.length ? "bg-slate-950" : "pointer-events-none bg-slate-400"}`} href="/checkout">Thanh toán</Link></section>
      </div>
    </main>
  );
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
