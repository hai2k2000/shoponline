import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RunResult = {
  jobType: string;
  status: "OK" | "WARN" | "ERROR";
  summary: string;
  details?: unknown;
};

async function saveRun(result: RunResult) {
  await prisma.automationRun.create({
    data: {
      jobType: result.jobType,
      status: result.status,
      summary: result.summary,
      details: result.details === undefined ? undefined : JSON.parse(JSON.stringify(result.details)),
    },
  });
}

async function runLowStockAlert(): Promise<RunResult> {
  const inventories = await prisma.inventory.findMany({
    where: { product: { status: "ACTIVE" } },
    include: { product: { select: { id: true, name: true, sku: true, minStock: true } } },
  });
  const rows = inventories
    .map((row) => ({ productId: row.product.id, name: row.product.name, sku: row.product.sku, minStock: row.product.minStock, quantity: row.quantity, reservedQuantity: row.reservedQuantity, available: row.quantity - row.reservedQuantity }))
    .filter((row) => row.available <= row.minStock);
  return { jobType: "LOW_STOCK_ALERT", status: rows.length ? "WARN" : "OK", summary: rows.length ? `${rows.length} sản phẩm tồn thấp.` : "Không có sản phẩm tồn thấp.", details: { rows } };
}

async function runPurchaseSuggestions(): Promise<RunResult> {
  const inventories = await prisma.inventory.findMany({
    where: { product: { status: "ACTIVE" } },
    include: { product: { select: { id: true, name: true, sku: true, minStock: true, costPrice: true } } },
  });
  const suggestions = inventories
    .map((row) => {
      const available = row.quantity - row.reservedQuantity;
      const suggestedQuantity = Math.max(0, row.product.minStock * 2 - available);
      return { productId: row.product.id, name: row.product.name, sku: row.product.sku, available, minStock: row.product.minStock, suggestedQuantity, estimatedCost: suggestedQuantity * Number(row.product.costPrice) };
    })
    .filter((row) => row.suggestedQuantity > 0);
  const estimatedCost = suggestions.reduce((sum, row) => sum + row.estimatedCost, 0);
  return { jobType: "PURCHASE_SUGGESTIONS", status: suggestions.length ? "WARN" : "OK", summary: suggestions.length ? `${suggestions.length} gợi ý nhập hàng, dự kiến ${formatMoney(estimatedCost)}.` : "Chưa cần nhập thêm hàng.", details: { suggestions, estimatedCost } };
}

async function runDebtReminders(): Promise<RunResult> {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const overdueDebts = await prisma.debt.findMany({
    where: { status: { in: ["OPEN", "PARTIAL"] }, dueDate: { lt: now } },
    include: { customer: { select: { name: true, phone: true } }, supplier: { select: { name: true, phone: true } } },
  });
  if (overdueDebts.length) {
    await prisma.debt.updateMany({ where: { id: { in: overdueDebts.map((debt) => debt.id) } }, data: { status: "OVERDUE" } });
  }
  const upcomingDebts = await prisma.debt.findMany({
    where: { status: { in: ["OPEN", "PARTIAL"] }, dueDate: { gte: now, lte: inThreeDays } },
    include: { customer: { select: { name: true, phone: true } }, supplier: { select: { name: true, phone: true } } },
  });
  const rows = [...overdueDebts, ...upcomingDebts].map((debt) => ({ id: debt.id, type: debt.type, party: debt.customer?.name || debt.supplier?.name || "Chưa gắn đối tượng", phone: debt.customer?.phone || debt.supplier?.phone || null, amount: Number(debt.amount), paidAmount: Number(debt.paidAmount), remaining: Number(debt.amount) - Number(debt.paidAmount), dueDate: debt.dueDate?.toISOString() || null, reminderType: debt.dueDate && debt.dueDate < now ? "OVERDUE" : "DUE_SOON" }));
  return { jobType: "DEBT_REMINDERS", status: rows.length ? "WARN" : "OK", summary: rows.length ? `${overdueDebts.length} công nợ quá hạn, ${upcomingDebts.length} công nợ sắp đến hạn.` : "Không có công nợ cần nhắc.", details: { rows } };
}

async function runOrderFollowup(): Promise<RunResult> {
  const olderThan24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await prisma.order.findMany({
    where: { orderStatus: "NEW", createdAt: { lt: olderThan24h } },
    include: { customer: { select: { name: true, phone: true } }, items: { select: { productName: true, quantity: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { jobType: "ORDER_FOLLOWUP", status: rows.length ? "WARN" : "OK", summary: rows.length ? `${rows.length} đơn mới quá 24 giờ chưa xác nhận.` : "Không có đơn mới quá hạn xử lý.", details: { rows: rows.map((order) => ({ id: order.id, orderCode: order.orderCode, customer: order.customer?.name || "Khách lẻ", phone: order.customer?.phone || null, total: Number(order.total), createdAt: order.createdAt.toISOString(), items: order.items })) } };
}

async function runDailyReport(): Promise<RunResult> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [orders, revenue, expenses, debts] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: start } } }),
    prisma.order.aggregate({ where: { orderStatus: "COMPLETED", updatedAt: { gte: start } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { status: "ACTIVE", createdAt: { gte: start } }, _sum: { amount: true } }),
    prisma.debt.findMany({ where: { status: { in: ["OPEN", "PARTIAL", "OVERDUE"] } }, select: { type: true, amount: true, paidAmount: true } }),
  ]);
  const receivable = debts.filter((debt) => debt.type === "CUSTOMER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const payable = debts.filter((debt) => debt.type === "SUPPLIER").reduce((sum, debt) => sum + Number(debt.amount) - Number(debt.paidAmount), 0);
  const data = { orders, revenue: Number(revenue._sum.total || 0), expenses: Number(expenses._sum.amount || 0), receivable, payable };
  return { jobType: "DAILY_REPORT", status: "OK", summary: `Hôm nay có ${orders} đơn, doanh thu hoàn tất ${formatMoney(data.revenue)}.`, details: data };
}

async function main() {
  const jobs = [runLowStockAlert, runPurchaseSuggestions, runDebtReminders, runOrderFollowup, runDailyReport];
  for (const job of jobs) {
    try {
      const result = await job();
      await saveRun(result);
      console.log(`${result.status} ${result.jobType}: ${result.summary}`);
    } catch (error) {
      const result = { jobType: job.name, status: "ERROR" as const, summary: error instanceof Error ? error.message : "Automation failed" };
      await saveRun(result);
      console.error(`${result.status} ${result.jobType}: ${result.summary}`);
      process.exitCode = 1;
    }
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

main().finally(async () => {
  await prisma.$disconnect();
});
