import type { PrismaClient } from "@prisma/client";

export type ReportDateRange = {
  from: Date;
  to: Date;
};

function defaultRange(): ReportDateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getReportsData(db: PrismaClient, range?: ReportDateRange) {
  const { from, to } = range || defaultRange();

  const [
    revenueSummary,
    expenseSummary,
    debtRows,
    inventoryRows,
    salesRows,
    productSalesRows,
  ] = await Promise.all([
    // Revenue: chỉ aggregate completed orders trong range
    db.order.aggregate({
      where: { orderStatus: "COMPLETED", updatedAt: { gte: from, lte: to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Expenses: chỉ active expenses trong range
    db.expense.aggregate({
      where: { status: "ACTIVE", createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    // Debts: chỉ lấy fields cần thiết
    db.debt.findMany({
      where: { status: { in: ["OPEN", "PARTIAL", "OVERDUE"] } },
      select: {
        type: true,
        amount: true,
        paidAmount: true,
        status: true,
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    // Inventory: chỉ active products
    db.inventory.findMany({
      where: { product: { status: { not: "ARCHIVED" } } },
      select: {
        quantity: true,
        reservedQuantity: true,
        product: { select: { name: true, sku: true, costPrice: true, minStock: true } },
      },
    }),
    // Sales rows: giới hạn 200 rows mới nhất trong range
    db.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        orderCode: true,
        orderStatus: true,
        total: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    // Product sales: aggregate theo orderItem trong range
    db.orderItem.findMany({
      where: { order: { orderStatus: "COMPLETED", updatedAt: { gte: from, lte: to } } },
      select: {
        productName: true,
        sku: true,
        quantity: true,
        salePrice: true,
        costPrice: true,
        total: true,
      },
    }),
  ]);

  const revenue = Number(revenueSummary._sum.total || 0);
  const completedOrders = revenueSummary._count.id;
  const expenseTotal = Number(expenseSummary._sum.amount || 0);
  // Profit = revenue - cost of goods sold - expenses (cùng time range)
  const cogs = productSalesRows.reduce((sum, item) => sum + Number(item.costPrice) * item.quantity, 0);
  const profit = revenue - cogs - expenseTotal;

  const receivable = debtRows
    .filter((d) => d.type === "CUSTOMER")
    .reduce((sum, d) => sum + Number(d.amount) - Number(d.paidAmount), 0);
  const payable = debtRows
    .filter((d) => d.type === "SUPPLIER")
    .reduce((sum, d) => sum + Number(d.amount) - Number(d.paidAmount), 0);

  const inventoryData = inventoryRows.map((row) => ({
    product: row.product.name,
    sku: row.product.sku,
    quantity: row.quantity,
    reservedQuantity: row.reservedQuantity,
    available: row.quantity - row.reservedQuantity,
    value: Number(row.product.costPrice) * row.quantity,
    minStock: row.product.minStock,
  }));
  const inventoryValue = inventoryData.reduce((sum, row) => sum + row.value, 0);

  // Aggregate product sales
  const productMap = new Map<string, { product: string; sku: string; quantity: number; revenue: number; profit: number }>();
  for (const item of productSalesRows) {
    const key = item.sku || item.productName;
    const existing = productMap.get(key) || { product: item.productName, sku: item.sku || "", quantity: 0, revenue: 0, profit: 0 };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.total);
    existing.profit += (Number(item.salePrice) - Number(item.costPrice)) * item.quantity;
    productMap.set(key, existing);
  }

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      revenue,
      expenses: expenseTotal,
      cogs,
      profit,
      orders: completedOrders,
      completedOrders,
      receivable,
      payable,
      inventoryValue,
    },
    salesRows: salesRows.map((o) => ({
      orderCode: o.orderCode,
      customer: o.customer?.name || "Khách lẻ",
      status: o.orderStatus,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
    })),
    inventoryRows: inventoryData,
    debtRows: debtRows.map((d) => ({
      type: d.type,
      party: d.customer?.name || d.supplier?.name || "Chưa gắn đối tượng",
      amount: Number(d.amount),
      paidAmount: Number(d.paidAmount),
      remaining: Number(d.amount) - Number(d.paidAmount),
      status: d.status,
    })),
    productSalesRows: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity),
  };
}

export async function getDashboardData(db: PrismaClient, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [
    productCount, categoryCount, customerCount, supplierCount, orderCount,
    todayOrders, monthOrders, completedRevenue, monthExpenses, monthCogs,
    debts, lowStock, recentOrders,
  ] = await Promise.all([
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.category.count({ where: { status: { not: "ARCHIVED" } } }),
    db.customer.count({ where: { status: { not: "ARCHIVED" } } }),
    db.supplier.count({ where: { status: { not: "ARCHIVED" } } }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: startOfToday } } }),
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.order.aggregate({ where: { orderStatus: "COMPLETED", updatedAt: { gte: startOfMonth } }, _sum: { total: true } }),
    db.expense.aggregate({ where: { status: "ACTIVE", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    // COGS tháng này từ completed order items
    db.orderItem.aggregate({
      where: { order: { orderStatus: "COMPLETED", updatedAt: { gte: startOfMonth } } },
      _sum: { quantity: true },
    }),
    db.debt.findMany({ where: { status: { in: ["OPEN", "PARTIAL", "OVERDUE"] } }, select: { type: true, amount: true, paidAmount: true } }),
    db.inventory.findMany({ where: { product: { status: { not: "ARCHIVED" } } }, select: { quantity: true, reservedQuantity: true, product: { select: { name: true, sku: true, minStock: true } } } }),
    db.order.findMany({ orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, orderCode: true, orderStatus: true, total: true, customer: { select: { name: true } }, items: { select: { productName: true, quantity: true } } } }),
  ]);

  const receivable = debts.filter((d) => d.type === "CUSTOMER").reduce((sum, d) => sum + Number(d.amount) - Number(d.paidAmount), 0);
  const payable = debts.filter((d) => d.type === "SUPPLIER").reduce((sum, d) => sum + Number(d.amount) - Number(d.paidAmount), 0);
  const lowStockRows = lowStock.filter((row) => row.quantity - row.reservedQuantity <= row.product.minStock);
  const revenue = Number(completedRevenue._sum.total || 0);
  const expenses = Number(monthExpenses._sum.amount || 0);

  return {
    metrics: {
      productCount, categoryCount, customerCount, supplierCount, orderCount,
      todayOrders, monthOrders, revenue, expenses,
      estimatedProfit: revenue - expenses,
      receivable, payable,
      lowStockCount: lowStockRows.length,
    },
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customer?.name || "Khách lẻ",
      items: order.items.map((item) => ({ productName: item.productName, quantity: item.quantity })),
      total: Number(order.total),
      orderStatus: order.orderStatus,
    })),
  };
}
