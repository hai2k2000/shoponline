import { ArrowLink, money, ProductImage, StatTile, StoreButton, StoreShell } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [setting, products, completedOrders, activeProducts] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 4, include: { inventory: true } }),
    prisma.order.count({ where: { orderStatus: "COMPLETED" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);
  const heroProduct = products[0];
  const storeName = setting?.storeName || "ShopOnline";

  return (
    <StoreShell storeName={storeName}>
      <section className="grid gap-8 py-4 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Cửa hàng trực tuyến</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">{storeName}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Mua hàng nhanh, tồn kho hiển thị theo dữ liệu thật và tra cứu trạng thái đơn rõ ràng sau khi đặt hàng.</p>
          <div className="flex flex-wrap gap-3"><StoreButton href="/products">Xem sản phẩm</StoreButton><StoreButton href="/tracking" variant="outline">Tra cứu đơn</StoreButton></div>
          <div className="grid gap-3 sm:grid-cols-3"><StatTile label="Sản phẩm đang bán" value={activeProducts} /><StatTile label="Đơn đã hoàn tất" value={completedOrders} /><StatTile label="Phí giao hàng" value={money(Number(setting?.shippingFee || 0))} /></div>
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {heroProduct ? <div className="grid gap-4"><ProductImage src={heroProduct.thumbnail} alt={heroProduct.name} /><div><p className="text-sm font-semibold text-emerald-700">Sản phẩm mới</p><h2 className="mt-1 text-xl font-semibold">{heroProduct.name}</h2><p className="mt-1 text-sm text-slate-500">{heroProduct.shortDescription || heroProduct.sku}</p><strong className="mt-3 block text-2xl">{money(Number(heroProduct.promotionPrice || heroProduct.salePrice))}</strong></div><StoreButton href="/products">Mua ngay</StoreButton></div> : <div className="grid min-h-80 place-items-center text-center text-slate-500">Sản phẩm đang được cập nhật.</div>}
        </aside>
      </section>

      <section className="grid gap-4 pb-10">
        <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Sản phẩm mới</h2><ArrowLink href="/products">Xem tất cả</ArrowLink></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <article key={product.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><ProductImage src={product.thumbnail} alt={product.name} /><div><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-sm text-slate-500">{product.sku}</p></div><strong>{money(Number(product.promotionPrice || product.salePrice))}</strong></article>)}</div>
      </section>
    </StoreShell>
  );
}
