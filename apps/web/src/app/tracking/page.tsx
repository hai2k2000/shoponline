import { EmptyPanel, Field, inputClass, money, PageIntro, StatusPill, StoreButton, StoreShell } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";
import { findTrackingOrder } from "@/server/services/tracking-service";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await searchParams;
  const [setting, order] = await Promise.all([prisma.storeSetting.findUnique({ where: { id: "default" } }), findTrackingOrder(prisma, code)]);
  return (
    <StoreShell storeName={setting?.storeName || "ShopOnline"} compact>
      <PageIntro eyebrow="Cửa hàng" title="Tra cứu đơn hàng" description="Nhập mã đơn để xem trạng thái xử lý và danh sách sản phẩm đã đặt." />
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]"><Field label="Mã đơn"><input className={inputClass} name="code" defaultValue={code} placeholder="Nhập mã đơn" /></Field><div className="flex items-end"><StoreButton type="submit">Tra cứu</StoreButton></div></form>
      {code && !order ? <EmptyPanel title="Không tìm thấy đơn hàng" description="Kiểm tra lại mã đơn hoặc liên hệ cửa hàng nếu bạn cần hỗ trợ." action={<StoreButton href="/products" variant="outline">Tiếp tục mua hàng</StoreButton>} /> : null}
      {order ? <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{order.orderCode}</h2><p className="text-sm text-slate-500">{order.customerName}</p></div><StatusPill>{viOrderStatus(order.orderStatus)}</StatusPill></div><div className="grid gap-2">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>{item.productName} x{item.quantity}</span><strong>{money(item.total)}</strong></div>)}</div><div className="flex justify-between border-t border-slate-100 pt-4"><span>Tổng tiền</span><strong>{money(order.total)}</strong></div></section> : null}
      <StoreButton href="/products" variant="outline">Tiếp tục mua hàng</StoreButton>
    </StoreShell>
  );
}
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
