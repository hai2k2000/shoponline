"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { checkoutAction } from "./actions";
import { Field, inputClass, money, PageIntro, StoreButton, StoreShell, textareaClass } from "@/components/public/ui";

type CartItem = { id: string; name: string; sku: string; price: number; quantity: number };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setItems(JSON.parse(localStorage.getItem("shoponline.cart") || "[]")));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  if (result) return <StoreShell compact><section className="grid place-items-center rounded-lg border border-emerald-200 bg-white px-6 py-14 text-center shadow-sm"><div className="grid max-w-md gap-4"><p className="text-sm font-semibold text-emerald-700">Đặt hàng thành công</p><h1 className="text-3xl font-semibold">Mã đơn {result}</h1><p className="text-sm leading-6 text-slate-600">Cửa hàng đã ghi nhận đơn hàng. Bạn có thể dùng mã này để theo dõi trạng thái xử lý.</p><StoreButton href={`/tracking?code=${result}`}>Theo dõi đơn</StoreButton></div></section></StoreShell>;

  return (
    <StoreShell>
      <PageIntro eyebrow="Cửa hàng" title="Thanh toán" description="Nhập thông tin nhận hàng và xác nhận đơn. Hệ thống sẽ kiểm tra lại tồn kho trước khi tạo đơn." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); formData.set("cart", JSON.stringify(items.map((item) => ({ id: item.id, quantity: item.quantity })))); startTransition(async () => { setError(""); const response = await checkoutAction(formData); if (response.ok && response.orderCode) { localStorage.removeItem("shoponline.cart"); setResult(response.orderCode); } else setError(response.error || "Không thể đặt hàng."); }); }} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <input type="hidden" name="cart" />
          <section className="grid gap-3 md:grid-cols-2"><Field label="Họ tên"><input required className={inputClass} name="name" /></Field><Field label="Số điện thoại"><input required className={inputClass} name="phone" /></Field><Field label="Email"><input className={inputClass} name="email" type="email" /></Field><Field label="Mã giảm giá"><input className={`${inputClass} uppercase`} name="couponCode" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="SALE2026" /></Field><Field label="Địa chỉ" wide><textarea required className={textareaClass} name="address" rows={3} /></Field><Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} /></Field></section>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="flex justify-end border-t border-slate-100 pt-4"><StoreButton type="submit" disabled={pending || !items.length}>{pending ? "Đang đặt..." : "Đặt hàng"}</StoreButton></div>
        </form>
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Đơn hàng</h2>{items.length ? <div className="mt-3 grid gap-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>{item.name} x{item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Giỏ hàng đang trống.</p>}<div className="mt-4 flex justify-between border-t border-slate-100 pt-4"><span>Tạm tính</span><strong>{money(total)}</strong></div></aside>
      </div>
    </StoreShell>
  );
}
