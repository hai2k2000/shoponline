import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const confirmed = process.env.CONFIRM_SMOKE_CLEANUP === "yes";

const insensitive = { mode: "insensitive" as const };

function containsSmoke(field: string) {
  return { [field]: { contains: "smoke", ...insensitive } };
}

function containsUat(field: string) {
  return { [field]: { contains: "uat", ...insensitive } };
}

function startsWith(field: string, value: string) {
  return { [field]: { startsWith: value, ...insensitive } };
}

function inIds(ids: string[]) {
  return { in: ids.length > 0 ? ids : ["__no_smoke_ids__"] };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

async function collectTargets() {
  const productWhere = {
    OR: [
      startsWith("sku", "SMOKE-"),
      startsWith("sku", "CAT-SMOKE-"),
      startsWith("sku", "CHK-"),
      startsWith("sku", "RPT-"),
      startsWith("sku", "TRK-"),
      startsWith("sku", "UAT-SKU-"),
      containsSmoke("name"),
      containsSmoke("slug"),
      startsWith("slug", "uat-product-"),
      containsUat("description"),
    ],
  };

  const categoryWhere = {
    OR: [
      startsWith("slug", "smoke-cat-"),
      startsWith("slug", "uat-cat-"),
      { slug: { in: ["backend-smoke", "checkout-smoke", "reporting-smoke", "tracking-smoke"] } },
      containsSmoke("name"),
      containsUat("name"),
    ],
  };

  const customerWhere = {
    OR: [
      startsWith("name", "Smoke "),
      startsWith("name", "UAT Customer "),
      startsWith("name", "Checkout Customer "),
      startsWith("name", "Reporting Customer "),
      startsWith("name", "Tracking Customer "),
      containsSmoke("notes"),
      containsSmoke("source"),
      containsUat("notes"),
      startsWith("email", "uat-"),
      startsWith("source", "UAT"),
    ],
  };

  const supplierWhere = {
    OR: [
      startsWith("name", "Smoke Supplier "),
      startsWith("name", "Reporting Supplier "),
      startsWith("taxCode", "TAX-"),
      containsSmoke("note"),
    ],
  };

  const promotionWhere = {
    OR: [
      startsWith("code", "SMOKE"),
      startsWith("code", "CHK"),
      startsWith("name", "Smoke Promo "),
      startsWith("name", "Checkout Smoke "),
      containsSmoke("description"),
    ],
  };

  const expenseWhere = {
    OR: [
      startsWith("title", "Smoke Expense "),
      startsWith("title", "Reporting Expense "),
      containsSmoke("note"),
    ],
  };

  const products = await prisma.product.findMany({ where: productWhere, select: { id: true } });
  const categories = await prisma.category.findMany({ where: categoryWhere, select: { id: true } });
  const customers = await prisma.customer.findMany({ where: customerWhere, select: { id: true } });
  const suppliers = await prisma.supplier.findMany({ where: supplierWhere, select: { id: true } });
  const promotions = await prisma.promotion.findMany({ where: promotionWhere, select: { id: true } });
  const expenses = await prisma.expense.findMany({ where: expenseWhere, select: { id: true } });

  const productIds = products.map((item) => item.id);
  const categoryIds = categories.map((item) => item.id);
  const customerIds = customers.map((item) => item.id);
  const supplierIds = suppliers.map((item) => item.id);
  const promotionIds = promotions.map((item) => item.id);
  const expenseIds = expenses.map((item) => item.id);

  const orderWhere = {
    OR: [
      startsWith("orderCode", "RPT"),
      startsWith("orderCode", "TRK"),
      containsSmoke("note"),
      containsUat("note"),
      { customerId: inIds(customerIds) },
      { items: { some: { productId: inIds(productIds) } } },
    ],
  };

  const purchaseWhere = {
    OR: [
      containsSmoke("note"),
      containsUat("note"),
      { supplierId: inIds(supplierIds) },
      { items: { some: { productId: inIds(productIds) } } },
    ],
  };

  const orders = await prisma.order.findMany({ where: orderWhere, select: { id: true } });
  const purchases = await prisma.purchaseOrder.findMany({ where: purchaseWhere, select: { id: true } });

  const orderIds = orders.map((item) => item.id);
  const purchaseIds = purchases.map((item) => item.id);

  const returns = await prisma.returnRequest.findMany({
    where: { OR: [{ orderId: inIds(orderIds) }, containsSmoke("reason"), containsSmoke("note")] },
    select: { id: true },
  });
  const returnIds = returns.map((item) => item.id);

  const allEntityIds = unique([
    ...productIds,
    ...categoryIds,
    ...customerIds,
    ...supplierIds,
    ...promotionIds,
    ...expenseIds,
    ...orderIds,
    ...purchaseIds,
    ...returnIds,
  ]);

  const usersToArchiveWhere = {
    status: { not: "ARCHIVED" as const },
    OR: [startsWith("email", "smoke-sales-"), startsWith("email", "smoke-auth-sales-"), startsWith("email", "smoke-inactive-")],
  };

  return {
    productIds,
    categoryIds,
    customerIds,
    supplierIds,
    promotionIds,
    expenseIds,
    orderIds,
    purchaseIds,
    returnIds,
    allEntityIds,
    promotionWhere: { id: inIds(promotionIds) },
    expenseWhere: { id: inIds(expenseIds) },
    usersToArchiveWhere,
  };
}

async function countTargets(targets: Awaited<ReturnType<typeof collectTargets>>) {
  const whereByModel = {
    refundTransactions: {
      OR: [
        { orderId: inIds(targets.orderIds) },
        { returnRequestId: inIds(targets.returnIds) },
        containsSmoke("reference"),
        containsSmoke("note"),
      ],
    },
    returnRequests: {
      OR: [{ id: inIds(targets.returnIds) }, { orderId: inIds(targets.orderIds) }, containsSmoke("reason"), containsSmoke("note")],
    },
    shipments: {
      OR: [{ orderId: inIds(targets.orderIds) }, startsWith("trackingCode", "TRK"), startsWith("trackingCode", "UATTRK"), containsSmoke("note"), containsUat("note")],
    },
    paymentTransactions: {
      OR: [{ orderId: inIds(targets.orderIds) }, startsWith("reference", "SMOKE"), startsWith("reference", "UAT-"), containsSmoke("note"), containsUat("note")],
    },
    orderItems: { orderId: inIds(targets.orderIds) },
    orders: { id: inIds(targets.orderIds) },
    purchaseOrderItems: { purchaseOrderId: inIds(targets.purchaseIds) },
    purchaseOrders: { id: inIds(targets.purchaseIds) },
    inventoryTransactions: {
      OR: [{ productId: inIds(targets.productIds) }, containsSmoke("note"), containsUat("note")],
    },
    inventories: { productId: inIds(targets.productIds) },
    productImages: { productId: inIds(targets.productIds) },
    products: { id: inIds(targets.productIds) },
    customerTimelines: {
      OR: [{ customerId: inIds(targets.customerIds) }, containsSmoke("title"), containsSmoke("note")],
    },
    debts: {
      OR: [{ customerId: inIds(targets.customerIds) }, { supplierId: inIds(targets.supplierIds) }, containsSmoke("note")],
    },
    expenses: targets.expenseWhere,
    promotions: targets.promotionWhere,
    notifications: {
      OR: [containsSmoke("title"), containsSmoke("message"), { entityId: inIds(targets.allEntityIds) }],
    },
    activityLogs: {
      OR: [containsSmoke("description"), { entityId: inIds(targets.allEntityIds) }],
    },
    customers: { id: inIds(targets.customerIds) },
    suppliers: { id: inIds(targets.supplierIds) },
    categories: { id: inIds(targets.categoryIds) },
    usersToArchive: targets.usersToArchiveWhere,
  };

  return {
    whereByModel,
    counts: {
      refundTransactions: await prisma.refundTransaction.count({ where: whereByModel.refundTransactions }),
      returnRequests: await prisma.returnRequest.count({ where: whereByModel.returnRequests }),
      shipments: await prisma.shipment.count({ where: whereByModel.shipments }),
      paymentTransactions: await prisma.paymentTransaction.count({ where: whereByModel.paymentTransactions }),
      orderItems: await prisma.orderItem.count({ where: whereByModel.orderItems }),
      orders: await prisma.order.count({ where: whereByModel.orders }),
      purchaseOrderItems: await prisma.purchaseOrderItem.count({ where: whereByModel.purchaseOrderItems }),
      purchaseOrders: await prisma.purchaseOrder.count({ where: whereByModel.purchaseOrders }),
      inventoryTransactions: await prisma.inventoryTransaction.count({ where: whereByModel.inventoryTransactions }),
      inventories: await prisma.inventory.count({ where: whereByModel.inventories }),
      productImages: await prisma.productImage.count({ where: whereByModel.productImages }),
      products: await prisma.product.count({ where: whereByModel.products }),
      customerTimelines: await prisma.customerTimeline.count({ where: whereByModel.customerTimelines }),
      debts: await prisma.debt.count({ where: whereByModel.debts }),
      expenses: await prisma.expense.count({ where: whereByModel.expenses }),
      promotions: await prisma.promotion.count({ where: whereByModel.promotions }),
      notifications: await prisma.notification.count({ where: whereByModel.notifications }),
      activityLogs: await prisma.activityLog.count({ where: whereByModel.activityLogs }),
      customers: await prisma.customer.count({ where: whereByModel.customers }),
      suppliers: await prisma.supplier.count({ where: whereByModel.suppliers }),
      categories: await prisma.category.count({ where: whereByModel.categories }),
      usersToArchive: await prisma.user.count({ where: whereByModel.usersToArchive }),
    },
  };
}

async function deleteTargets(whereByModel: Awaited<ReturnType<typeof countTargets>>["whereByModel"]) {
  return prisma.$transaction(async (tx) => {
    const results = {
      refundTransactions: await tx.refundTransaction.deleteMany({ where: whereByModel.refundTransactions }),
      returnRequests: await tx.returnRequest.deleteMany({ where: whereByModel.returnRequests }),
      shipments: await tx.shipment.deleteMany({ where: whereByModel.shipments }),
      paymentTransactions: await tx.paymentTransaction.deleteMany({ where: whereByModel.paymentTransactions }),
      orderItems: await tx.orderItem.deleteMany({ where: whereByModel.orderItems }),
      orders: await tx.order.deleteMany({ where: whereByModel.orders }),
      purchaseOrderItems: await tx.purchaseOrderItem.deleteMany({ where: whereByModel.purchaseOrderItems }),
      purchaseOrders: await tx.purchaseOrder.deleteMany({ where: whereByModel.purchaseOrders }),
      inventoryTransactions: await tx.inventoryTransaction.deleteMany({ where: whereByModel.inventoryTransactions }),
      inventories: await tx.inventory.deleteMany({ where: whereByModel.inventories }),
      productImages: await tx.productImage.deleteMany({ where: whereByModel.productImages }),
      products: await tx.product.deleteMany({ where: whereByModel.products }),
      customerTimelines: await tx.customerTimeline.deleteMany({ where: whereByModel.customerTimelines }),
      debts: await tx.debt.deleteMany({ where: whereByModel.debts }),
      expenses: await tx.expense.deleteMany({ where: whereByModel.expenses }),
      promotions: await tx.promotion.deleteMany({ where: whereByModel.promotions }),
      notifications: await tx.notification.deleteMany({ where: whereByModel.notifications }),
      activityLogs: await tx.activityLog.deleteMany({ where: whereByModel.activityLogs }),
      customers: await tx.customer.deleteMany({ where: whereByModel.customers }),
      suppliers: await tx.supplier.deleteMany({ where: whereByModel.suppliers }),
      categories: await tx.category.deleteMany({ where: whereByModel.categories }),
      usersToArchive: await tx.user.updateMany({ where: whereByModel.usersToArchive, data: { status: "ARCHIVED" } }),
    };

    return Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.count]));
  });
}

function printCounts(title: string, counts: Record<string, number>) {
  console.log(title);
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    total += count;
    console.log(`- ${key}: ${count}`);
  }
  console.log(`Total matched rows/actions: ${total}`);
}

async function main() {
  const targets = await collectTargets();
  const { whereByModel, counts } = await countTargets(targets);
  printCounts(confirmed ? "Smoke cleanup target counts:" : "Smoke cleanup dry-run target counts:", counts);

  if (!confirmed) {
    console.log("Dry run only. Set CONFIRM_SMOKE_CLEANUP=yes to delete/archive matched smoke data.");
    return;
  }

  const deleted = await deleteTargets(whereByModel);
  printCounts("Smoke cleanup applied:", deleted);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
