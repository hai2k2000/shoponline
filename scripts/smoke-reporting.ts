import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getDashboardData, getReportsData } from "../apps/web/src/server/services/reporting-service";

const prisma = new PrismaClient();

function assertAtLeast(actual: number, minimum: number, label: string) {
  if (actual < minimum) throw new Error(`${label}: expected at least ${minimum}, got ${actual}.`);
}

async function main() {
  const stamp = Date.now().toString().slice(-8);
  const category = await prisma.category.upsert({
    where: { slug: "reporting-smoke" },
    update: { status: "ACTIVE" },
    create: { name: "Reporting Smoke", slug: "reporting-smoke", status: "ACTIVE" },
  });
  const customer = await prisma.customer.create({ data: { name: `Reporting Customer ${stamp}`, phone: `06${stamp}`, status: "ACTIVE" } });
  const supplier = await prisma.supplier.create({ data: { name: `Reporting Supplier ${stamp}`, phone: `05${stamp}`, status: "ACTIVE" } });
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: `Reporting Product ${stamp}`,
      slug: `reporting-product-${stamp}`,
      sku: `RPT-${stamp}`,
      costPrice: 20000,
      salePrice: 50000,
      status: "ACTIVE",
      minStock: 5,
      inventory: { create: { quantity: 4, reservedQuantity: 1 } },
    },
  });
  const order = await prisma.order.create({
    data: {
      orderCode: `RPT${stamp}`,
      customerId: customer.id,
      subtotal: 100000,
      shippingFee: 10000,
      discount: 5000,
      total: 105000,
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      note: `reporting smoke ${stamp}`,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 2,
          costPrice: 20000,
          salePrice: 50000,
          total: 100000,
        },
      },
    },
  });
  await prisma.expense.create({ data: { title: `Reporting Expense ${stamp}`, category: "Smoke", amount: 15000, status: "ACTIVE" } });
  await prisma.debt.create({ data: { type: "CUSTOMER", customerId: customer.id, amount: 40000, paidAmount: 10000, status: "PARTIAL", note: `reporting receivable ${stamp}` } });
  await prisma.debt.create({ data: { type: "SUPPLIER", supplierId: supplier.id, amount: 70000, paidAmount: 20000, status: "OPEN", note: `reporting payable ${stamp}` } });

  const reports = await getReportsData(prisma);
  assertAtLeast(reports.summary.revenue, 105000, "Reports revenue");
  assertAtLeast(reports.summary.expenses, 15000, "Reports expenses");
  assertAtLeast(reports.summary.receivable, 30000, "Reports receivable");
  assertAtLeast(reports.summary.payable, 50000, "Reports payable");
  const salesRow = reports.salesRows.find((row) => row.orderCode === order.orderCode);
  if (!salesRow || salesRow.total !== 105000) throw new Error("Reports sales row missing smoke order.");
  const inventoryRow = reports.inventoryRows.find((row) => row.sku === product.sku);
  if (!inventoryRow || inventoryRow.available !== 3 || inventoryRow.value !== 80000) throw new Error("Reports inventory row has unexpected values.");
  const productRow = reports.productSalesRows.find((row) => row.sku === product.sku);
  if (!productRow || productRow.quantity !== 2 || productRow.revenue !== 100000 || productRow.profit !== 60000) throw new Error("Reports product sales row has unexpected values.");

  const dashboard = await getDashboardData(prisma);
  assertAtLeast(dashboard.metrics.revenue, 105000, "Dashboard revenue");
  assertAtLeast(dashboard.metrics.expenses, 15000, "Dashboard expenses");
  assertAtLeast(dashboard.metrics.receivable, 30000, "Dashboard receivable");
  assertAtLeast(dashboard.metrics.payable, 50000, "Dashboard payable");
  assertAtLeast(dashboard.metrics.lowStockCount, 1, "Dashboard low-stock count");
  if (!dashboard.recentOrders.some((row) => row.orderCode === order.orderCode)) throw new Error("Dashboard recent orders missing smoke order.");

  console.log("ShopOnline reporting smoke passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
