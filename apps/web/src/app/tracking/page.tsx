import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { findTrackingOrder } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await searchParams;
  const order = await findTrackingOrder(prisma, code);
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header><p className="text-sm font-semibold text-emerald-700">Cửa hàng</p><h1 className="text-3xl font-semibold">Tra cứu đơn hàng</h1></header>
        <form className="flex gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><input className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" name="code" defaultValue={code} placeholder="Nhập mã đơn" /><button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Tra cứu</button></form>
        {code && !order ? <section className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">Không tìm thấy đơn hàng.</section> : null}
        {order ? <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{order.orderCode}</h2><p className="text-sm text-slate-500">{order.customerName}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{viOrderStatus(order.orderStatus)}</span></div><div className="grid gap-2">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>{item.productName} x{item.quantity}</span><strong>{money(item.total)}</strong></div>)}</div><div className="flex justify-between border-t border-slate-100 pt-4"><span>Tổng tiền</span><strong>{money(order.total)}</strong></div></section> : null}
        <Link className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" href="/products">Tiếp tục mua hàng</Link>
      </div>
    </main>
  );
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
