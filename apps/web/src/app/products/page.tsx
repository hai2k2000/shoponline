import { PageIntro, StoreShell } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";
import { PublicProductsClient } from "./PublicProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [setting, products] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, include: { inventory: true } }),
  ]);
  const rows = products.map((row) => ({ id: row.id, name: row.name, slug: row.slug, sku: row.sku, shortDescription: row.shortDescription, salePrice: Number(row.salePrice), promotionPrice: row.promotionPrice ? Number(row.promotionPrice) : null, thumbnail: row.thumbnail, available: (row.inventory?.quantity || 0) - (row.inventory?.reservedQuantity || 0) })).filter((row) => row.available > 0);

  return (
    <StoreShell storeName={setting?.storeName || "ShopOnline"}>
      <PageIntro eyebrow="Cửa hàng" title="Danh sách sản phẩm" description="Chọn sản phẩm còn tồn kho để thêm vào giỏ hàng và đặt đơn. Giá và tồn kho được lấy trực tiếp từ hệ thống quản trị." />
      <PublicProductsClient products={rows} />
    </StoreShell>
  );
}
