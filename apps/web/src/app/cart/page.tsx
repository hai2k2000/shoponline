"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyPanel, money, PageIntro, StoreButton, StoreShell } from "@/components/public/ui";

type CartItem = { id: string; name: string; sku: string; price: number; quantity: number };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setItems(JSON.parse(localStorage.getItem("shoponline.cart") || "[]")));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem("shoponline.cart", JSON.stringify(next)); };
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return (
    <StoreShell compact>
      <PageIntro eyebrow="Cửa hàng" title="Giỏ hàng" description="Kiểm tra lại sản phẩm, số lượng và tổng tiền trước khi chuyển sang thanh toán." action={<StoreButton href="/products" variant="outline">Tiếp tục mua</StoreButton>} />
      {items.length ? <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Đơn giá</th><th className="px-4 py-3">Số lượng</th><th className="px-4 py-3">Thành tiền</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.sku}</p></td><td className="px-4 py-3">{money(item.price)}</td><td className="px-4 py-3"><input className="h-10 w-24 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" type="number" min={1} value={item.quantity} onChange={(event) => save(items.map((row) => row.id === item.id ? { ...row, quantity: Math.max(1, Number(event.target.value || 1)) } : row))} /></td><td className="px-4 py-3 font-semibold">{money(item.price * item.quantity)}</td><td className="px-4 py-3 text-right"><button className="rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50" onClick={() => save(items.filter((row) => row.id !== item.id))}>Xóa</button></td></tr>)}</tbody></table></div></section> : <EmptyPanel title="Giỏ hàng đang trống" description="Thêm sản phẩm vào giỏ để bắt đầu đặt hàng." action={<StoreButton href="/products">Xem sản phẩm</StoreButton>} />}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div><span className="text-sm text-slate-500">{count} sản phẩm</span><strong className="mt-1 block text-2xl">{money(total)}</strong></div><StoreButton href="/checkout" disabled={!items.length}>Thanh toán</StoreButton></section>
    </StoreShell>
  );
}
