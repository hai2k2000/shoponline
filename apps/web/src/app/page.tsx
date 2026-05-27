import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [setting, products, completedOrders] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 4, include: { inventory: true } }),
    prisma.order.count({ where: { orderStatus: "COMPLETED" } }),
  ]);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="text-xl font-semibold" href="/">{setting?.storeName || "ShopOnline"}</Link>
          <nav className="flex gap-4 text-sm font-semibold"><Link href="/products">Sản phẩm</Link><Link href="/cart">Giỏ hàng</Link><Link href="/tracking">Tra cứu đơn</Link><Link href="/admin/dashboard">Quản trị</Link></nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_420px]">
        <div className="grid content-center gap-5">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">Online store</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{setting?.storeName || "ShopOnline"}</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">Mua hàng nhanh, theo dõi đơn rõ ràng, tồn kho đồng bộ trực tiếp với hệ thống quản trị.</p>
          <div className="flex flex-wrap gap-3"><Link className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/products">Xem sản phẩm</Link><Link className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold" href="/tracking">Tra cứu đơn</Link></div>
        </div>
        <aside className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Metric label="Sản phẩm đang bán" value={products.length} />
          <Metric label="Đơn đã hoàn tất" value={completedOrders} />
          <Metric label="Phí giao hàng" value={money(Number(setting?.shippingFee || 0))} />
          <Metric label="Liên hệ" value={setting?.phone || "Đang cập nhật"} />
        </aside>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-semibold">Sản phẩm mới</h2><Link className="text-sm font-semibold text-emerald-700" href="/products">Xem tất cả</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-sm text-slate-500">{product.sku}</p><strong className="mt-3 block">{money(Number(product.salePrice))}</strong></article>)}</div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-50 p-4"><span className="text-sm text-slate-500">{label}</span><strong className="mt-1 block text-xl">{value}</strong></div>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
