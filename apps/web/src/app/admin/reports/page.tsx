import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [orders, expenses, debts, inventory, orderItems] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
    prisma.expense.findMany({ where: { status: "ACTIVE" } }),
    prisma.debt.findMany({ include: { customer: { select: { name: true } }, supplier: { select: { name: true } } } }),
    prisma.inventory.findMany({ include: { product: { select: { name: true, sku: true, costPrice: true, minStock: true, status: true } } } }),
    prisma.orderItem.findMany({ include: { order: { select: { orderStatus: true } } } }),
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

  return (
    <ReportsClient
      summary={{ revenue, expenses: expenseTotal, profit: revenue - expenseTotal, orders: orders.length, completedOrders: completedOrders.length, receivable, payable, inventoryValue }}
      salesRows={orders.map((order) => ({ orderCode: order.orderCode, customer: order.customer?.name || "Khách lẻ", status: order.orderStatus, total: Number(order.total), createdAt: order.createdAt.toISOString() }))}
      inventoryRows={inventoryRows}
      debtRows={debts.map((debt) => ({ type: debt.type, party: debt.customer?.name || debt.supplier?.name || "Chưa gắn đối tượng", amount: Number(debt.amount), paidAmount: Number(debt.paidAmount), remaining: Number(debt.amount) - Number(debt.paidAmount), status: debt.status }))}
      productSalesRows={Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)}
    />
  );
}
