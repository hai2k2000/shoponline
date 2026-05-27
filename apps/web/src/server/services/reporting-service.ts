import type { PrismaClient } from "@prisma/client";

export async function getReportsData(db: PrismaClient) {
  const [orders, expenses, debts, inventory, orderItems] = await Promise.all([
    db.order.findMany({ orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
    db.expense.findMany({ where: { status: "ACTIVE" } }),
    db.debt.findMany({ include: { customer: { select: { name: true } }, supplier: { select: { name: true } } } }),
    db.inventory.findMany({ include: { product: { select: { name: true, sku: true, costPrice: true, minStock: true, status: true } } } }),
    db.orderItem.findMany({ include: { order: { select: { orderStatus: true } } } }),
  ]);

  const completedOrders = orders.filter((order) => order.orderStatus === "COMPLETED");
  const revenue = completedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const receivable = debts.filter((debt) => debt.type === "CUSTOMER" && ["OPEN", "PARTIAL", "OVERDUE"].includes(debt.status)).reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const payable = debts.filter((debt) => debt.type === "SUPPLIER" && ["OPEN", "PARTIAL", "OVERDUE"].includes(debt.status)).reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const inventoryRows = inventory.filter((row) => row.product.status !== "ARCHIVED").map((row) => {
    const value = Number(row.product.costPrice) * row.quantity;
    return { product: row.product.name, sku: row.product.sku, quantity: row.quantity, reservedQuantity: row.reservedQuantity, available: row.quantity - row.reservedQuantity, value, minStock: row.product.minStock };
  });
  const inventoryValue = inventoryRows.reduce((sum, row) => sum + row.value, 0);
  const productMap = new Map<string, { product: string; sku: string; quantity: number; revenue: number; profit: number }>();
  for (const item of orderItems.filter((row) => row.order.orderStatus === "COMPLETED")) {
    const key = item.sku || item.productName;
    const existing = productMap.get(key) || { product: item.productName, sku: item.sku || "", quantity: 0, revenue: 0, profit: 0 };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.total);
    existing.profit += (Number(item.salePrice) - Number(item.costPrice)) * item.quantity;
    productMap.set(key, existing);
  }

  return {
    summary: { revenue, expenses: expenseTotal, profit: revenue - expenseTotal, orders: orders.length, completedOrders: completedOrders.length, receivable, payable, inventoryValue },
    salesRows: orders.map((order) => ({ orderCode: order.orderCode, customer: order.customer?.name || "Khách lẻ", status: order.orderStatus, total: Number(order.total), createdAt: order.createdAt.toISOString() })),
    inventoryRows,
    debtRows: debts.map((debt) => ({ type: debt.type, party: debt.customer?.name || debt.supplier?.name || "Chưa gắn đối tượng", amount: Number(debt.amount), paidAmount: Number(debt.paidAmount), remaining: Number(debt.amount) - Number(debt.paidAmount), status: debt.status })),
    productSalesRows: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity),
  };
}

export async function getDashboardData(db: PrismaClient, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [productCount, categoryCount, customerCount, supplierCount, orderCount, todayOrders, monthOrders, completedRevenue, monthExpenses, debts, lowStock, recentOrders] = await Promise.all([
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.category.count({ where: { status: { not: "ARCHIVED" } } }),
    db.customer.count({ where: { status: { not: "ARCHIVED" } } }),
    db.supplier.count({ where: { status: { not: "ARCHIVED" } } }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: startOfToday } } }),
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.order.aggregate({ where: { orderStatus: "COMPLETED" }, _sum: { total: true } }),
    db.expense.aggregate({ where: { status: "ACTIVE", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.debt.findMany({ where: { status: { in: ["OPEN", "PARTIAL", "OVERDUE"] } }, select: { type: true, amount: true, paidAmount: true } }),
    db.inventory.findMany({ where: { product: { status: { not: "ARCHIVED" } } }, include: { product: { select: { name: true, sku: true, minStock: true } } } }),
    db.order.findMany({ orderBy: { updatedAt: "desc" }, take: 6, include: { customer: { select: { name: true } }, items: { select: { productName: true, quantity: true } } } }),
  ]);

  const receivable = debts.filter((debt) => debt.type === "CUSTOMER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const payable = debts.filter((debt) => debt.type === "SUPPLIER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const lowStockRows = lowStock.filter((row) => row.quantity - row.reservedQuantity <= row.product.minStock);
  const revenue = Number(completedRevenue._sum.total || 0);
  const expenses = Number(monthExpenses._sum.amount || 0);

  return {
    metrics: {
      productCount,
      categoryCount,
      customerCount,
      supplierCount,
      orderCount,
      todayOrders,
      monthOrders,
      revenue,
      expenses,
      estimatedProfit: revenue - expenses,
      receivable,
      payable,
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
