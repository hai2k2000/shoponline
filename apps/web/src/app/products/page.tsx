import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicProductsClient } from "./PublicProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [setting, products] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, include: { inventory: true } }),
  ]);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="text-xl font-semibold" href="/">{setting?.storeName || "ShopOnline"}</Link>
          <nav className="flex gap-4 text-sm font-semibold"><Link href="/products">Sản phẩm</Link><Link href="/cart">Giỏ hàng</Link><Link href="/tracking">Tra cứu đơn</Link></nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 pt-8">
        <p className="text-sm font-semibold text-emerald-700">Cửa hàng</p>
        <h1 className="mt-1 text-3xl font-semibold">Danh sách sản phẩm</h1>
        <p className="mt-1 text-sm text-slate-600">Chọn sản phẩm còn tồn kho để thêm vào giỏ hàng và đặt đơn.</p>
      </section>
      <PublicProductsClient products={products.map((row) => ({ id: row.id, name: row.name, slug: row.slug, sku: row.sku, shortDescription: row.shortDescription, salePrice: Number(row.salePrice), promotionPrice: row.promotionPrice ? Number(row.promotionPrice) : null, thumbnail: row.thumbnail, available: (row.inventory?.quantity || 0) - (row.inventory?.reservedQuantity || 0) })).filter((row) => row.available > 0)} />
    </main>
  );
}
