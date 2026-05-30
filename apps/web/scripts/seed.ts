import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@shoponline.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "123456";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "admin", role: UserRole.ADMIN, passwordHash },
    create: { name: "admin", email: adminEmail, role: UserRole.ADMIN, passwordHash },
  });

  const category = await prisma.category.upsert({
    where: { slug: "san-pham-moi" },
    update: {},
    create: { name: "S?n ph?m m?i", slug: "san-pham-moi", description: "Danh m?c demo", status: "ACTIVE" },
  });

  const product = await prisma.product.upsert({
    where: { sku: "SKU-DEMO-001" },
    update: {},
    create: {
      categoryId: category.id,
      name: "S?n ph?m demo",
      slug: "san-pham-demo",
      sku: "SKU-DEMO-001",
      shortDescription: "S?n ph?m m?u ?? ki?m tra quy tr?nh b?n h?ng",
      costPrice: 70000,
      salePrice: 120000,
      status: "ACTIVE",
      minStock: 5,
      inventory: { create: { quantity: 20, reservedQuantity: 0 } },
      transactions: { create: { type: "IMPORT", quantity: 20, beforeQuantity: 0, afterQuantity: 20, note: "Seed t?n kho ban ??u" } },
    },
  });

  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", storeName: "ShopOnline", email: "admin@shoponline.local", shippingFee: 30000 },
  });

  await prisma.activityLog.create({
    data: { userId: admin.id, action: "SEED", entityType: "System", entityId: product.id, description: "Seed d? li?u kh?i t?o ShopOnline" },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
