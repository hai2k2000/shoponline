import { notFound } from "next/navigation";
import { PageIntro, StatTile, StoreButton, StoreShell, money } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";
import { ProductDetailActions } from "./ProductDetailActions";
import { ProductGallery } from "./ProductGallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [setting, product] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findFirst({ where: { slug, status: "ACTIVE" }, select: { name: true, shortDescription: true, metaTitle: true, metaDescription: true, thumbnail: true, tags: true } }),
  ]);
  if (!product) return {};
  const storeName = setting?.storeName || "ShopOnline";
  const title = product.metaTitle || product.name + " - " + storeName;
  const description = product.metaDescription || product.shortDescription || "";
  return {
    title,
    description,
    keywords: product.tags || "",
    openGraph: { title, description, images: product.thumbnail ? [product.thumbnail] : [] },
  };
}



export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [setting, product] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findFirst({
      where: { slug, status: "ACTIVE" },
      include: {
        category: true,
        inventory: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  if (!product) notFound();

  const available = Math.max(0, (product.inventory?.quantity || 0) - (product.inventory?.reservedQuantity || 0));
  const price = Number(product.promotionPrice || product.salePrice);
  const salePrice = Number(product.salePrice);

  // Build gallery: images array first, fallback to thumbnail
  const galleryUrls: string[] = product.images.length > 0
    ? product.images.map((img) => img.imageUrl)
    : product.thumbnail
    ? [product.thumbnail]
    : [];

  return (
    <StoreShell storeName={setting?.storeName || "ShopOnline"}>
      <PageIntro
        eyebrow="Cửa hàng / Sản phẩm"
        title={product.name}
        description={product.shortDescription || "Thông tin sản phẩm được lấy trực tiếp từ hệ thống quản trị."}
        action={<StoreButton href="/products" variant="outline">Quay lại danh sách</StoreButton>}
      />

      <section className="grid gap-6 lg:grid-cols-[480px_1fr]">
        <ProductGallery urls={galleryUrls} name={product.name} />
        <div className="grid content-start gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-500">{product.category?.name || "Chưa phân loại"} / {product.sku}</p>
            <strong className="mt-3 block text-3xl font-semibold">{money(price)}</strong>
            {product.promotionPrice ? <span className="text-sm text-slate-400 line-through">{money(salePrice)}</span> : null}
          </div>

          <section className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Tồn khả dụng" value={available} hint="Đã trừ số lượng giữ đơn" />
            <StatTile label="Giá bán" value={money(salePrice)} />
            <StatTile label="Đặt hàng" value={available > 0 ? "Có sẵn" : "Hết hàng"} />
          </section>

          {available > 0
            ? <ProductDetailActions product={{ id: product.id, name: product.name, sku: product.sku, price, quantity: 1 }} />
            : <StoreButton href="/products" disabled>Hết hàng</StoreButton>}

          <div className="border-t border-slate-100 pt-4">
            <h2 className="font-semibold">Mô tả</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{product.description || product.shortDescription || "Sản phẩm chưa có mô tả chi tiết."}</p>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
