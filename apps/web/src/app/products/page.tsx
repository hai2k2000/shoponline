import { PageIntro, StoreShell } from "@/components/public/ui";
import { prisma } from "@/lib/prisma";
import { PublicProductsClient } from "./PublicProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [setting, products, categories] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: {
        inventory: true,
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const rows = products
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      shortDescription: row.shortDescription,
      salePrice: Number(row.salePrice),
      promotionPrice: row.promotionPrice ? Number(row.promotionPrice) : null,
      thumbnail: row.images[0]?.imageUrl || row.thumbnail,
      available: (row.inventory?.quantity || 0) - (row.inventory?.reservedQuantity || 0),
      categoryId: row.categoryId,
      categoryName: row.category?.name || null,
    }))
    .filter((row) => row.available > 0);

  return (
    <StoreShell storeName={setting?.storeName || "ShopOnline"}>
      <PageIntro
        eyebrow="Cửa hàng"
        title="Danh sách sản phẩm"
        description="Chọn sản phẩm còn tồn kho để thêm vào giỏ hàng và đặt đơn."
      />
      <PublicProductsClient products={rows} categories={categories} />
    </StoreShell>
  );
}
