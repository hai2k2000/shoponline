import type { ReactNode } from "react";
import { Activity, CheckCircle2, ClipboardCheck, Database, ShieldCheck, Terminal, TriangleAlert } from "lucide-react";
import { AdminPage, DataPanel, PageHeader, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DbNowRow = { now: Date };
type CountRow = { count: bigint };
type HealthRow = { label: string; value: string | number; tone: Tone; hint: string };

const smokeNeedle = { contains: "smoke", mode: "insensitive" as const };
const uatNeedle = { contains: "uat", mode: "insensitive" as const };

export default async function AdminSystemPage() {
  const [
    dbNow,
    productCount,
    activeProductCount,
    customerCount,
    orderCount,
    openOrderCount,
    unpaidOrderCount,
    lowStockCount,
    unreadNotificationCount,
    automationErrorCount,
    smokeRows,
    latestAutomationRuns,
    latestActivityLogs,
  ] = await Promise.all([
    prisma.$queryRaw<DbNowRow[]>`SELECT NOW() as now`,
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: { in: ["NEW", "CONFIRMED", "PACKING", "SHIPPING"] } } }),
    prisma.order.count({ where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] }, orderStatus: { notIn: ["CANCELLED", "RETURNED"] } } }),
    countLowStockRows(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.automationRun.count({ where: { status: "ERROR", createdAt: { gte: hoursAgo(24) } } }),
    countSmokeLikeRows(),
    prisma.automationRun.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
  ]);

  const dbTime = dbNow[0]?.now;
  const healthRows: HealthRow[] = [
    { label: "Database", value: "OK", tone: "emerald", hint: dbTime ? `DB time ${dateText(dbTime)}` : "SELECT NOW() passed" },
    { label: "Open orders", value: openOrderCount, tone: openOrderCount ? "blue" : "slate", hint: "Orders still being handled" },
    { label: "Unpaid/partial", value: unpaidOrderCount, tone: unpaidOrderCount ? "amber" : "emerald", hint: "Orders needing payment follow-up" },
    { label: "Low stock", value: lowStockCount, tone: lowStockCount ? "amber" : "emerald", hint: "Active SKUs at or below min stock" },
    { label: "Unread alerts", value: unreadNotificationCount, tone: unreadNotificationCount ? "amber" : "emerald", hint: "Notifications not read yet" },
    { label: "Automation errors", value: automationErrorCount, tone: automationErrorCount ? "red" : "emerald", hint: "ERROR runs in the last 24h" },
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / System"
        title="System status"
        description="Operational readiness view for database health, business counters, automation runs, smoke/UAT residue, and handoff commands."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {healthRows.map((row) => <StatCard key={row.label} label={row.label} value={row.value} tone={row.tone} hint={row.hint} />)}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <DataPanel>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold"><Database className="size-4" />Business data snapshot</h2>
          </div>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr><th className="px-4 py-3">Area</th><th className="px-4 py-3">Count</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">Link</th></tr>
            </thead>
            <tbody>
              <SnapshotRow label="Products" value={`${activeProductCount} active / ${productCount} total`} note="Catalog records in database" href="/admin/products" />
              <SnapshotRow label="Customers" value={customerCount} note="Non-archived customer records" href="/admin/customers" />
              <SnapshotRow label="Orders" value={orderCount} note={`${openOrderCount} open orders`} href="/admin/orders" />
              <SnapshotRow label="Payments" value={unpaidOrderCount} note="Orders still unpaid or partial" href="/admin/finance/payments" />
              <SnapshotRow label="Inventory" value={lowStockCount} note="Active low-stock SKUs" href="/admin/inventory" />
              <SnapshotRow label="Smoke/UAT dry-run estimate" value={smokeRows.total} note="Approximate residue count. Use CLI cleanup for exact deletion targets." href="/admin/system" />
            </tbody>
          </table>
        </DataPanel>

        <section className="grid gap-4">
          <CommandCard
            icon={<CheckCircle2 className="size-5 text-emerald-700" />}
            title="Before handoff"
            command="npm run release:readiness"
            description="Runs backup restore verification, readiness smoke, production smoke, catalog workflow, business UAT, tracking, and cleanup dry-run."
          />
          <CommandCard
            icon={<TriangleAlert className="size-5 text-amber-700" />}
            title="Cleanup dry-run"
            command="npm run smoke:cleanup"
            description="Reports smoke/UAT rows only. Review counts before deleting anything."
          />
          <CommandCard
            icon={<ShieldCheck className="size-5 text-red-700" />}
            title="Confirmed cleanup"
            command="CONFIRM_SMOKE_CLEANUP=yes npm run smoke:cleanup"
            description="Destructive. Run only after dry-run targets are reviewed."
          />
        </section>
      </section>

      <DataPanel>
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4" />Operator UAT checklist</h2>
          <p className="mt-1 text-sm text-slate-600">Run these manual checks with the operator after automated readiness passes.</p>
        </div>
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
          <UatChecklistItem title="Catalog and stock" details="Create or edit one product, verify inventory availability, low-stock warning, purchase shortcut, and CSV export." />
          <UatChecklistItem title="Order to payment" details="Create one admin order, record partial and final payment, then confirm paid and remaining amounts on orders, payments, and reports." />
          <UatChecklistItem title="Shipment and tracking" details="Create a shipment, move it to shipped, then verify order links and customer tracking reconciliation." />
          <UatChecklistItem title="Return or refund" details="Create a return for a completed order, approve or reject it, and verify inventory/payment side effects if received or refunded." />
          <UatChecklistItem title="Finance handoff" details="Open payments, debts, expenses, and reports; verify filters, totals, and exported CSV files match accounting expectations." />
          <UatChecklistItem title="Access and audit" details="Confirm non-admin roles cannot access restricted areas, then review audit logs and notifications for the test actions." />
        </div>
      </DataPanel>

      <section className="grid gap-4 lg:grid-cols-2">
        <DataPanel>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold"><Activity className="size-4" />Latest automation runs</h2>
          </div>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Summary</th><th className="px-4 py-3">Time</th></tr></thead>
            <tbody>{latestAutomationRuns.map((run) => <tr key={run.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3 font-semibold">{run.jobType}</td><td className="px-4 py-3"><StatusBadge tone={automationTone(run.status)}>{run.status}</StatusBadge></td><td className="px-4 py-3">{run.summary}</td><td className="px-4 py-3 whitespace-nowrap">{dateText(run.createdAt)}</td></tr>)}</tbody>
          </table>
        </DataPanel>

        <DataPanel>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold"><Activity className="size-4" />Latest activity logs</h2>
          </div>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Time</th></tr></thead>
            <tbody>{latestActivityLogs.map((log) => <tr key={log.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3 font-semibold">{log.action}</td><td className="px-4 py-3">{log.entityType}<p className="font-mono text-xs text-slate-500">{log.entityId || "-"}</p></td><td className="px-4 py-3">{log.user?.email || "-"}</td><td className="px-4 py-3 whitespace-nowrap">{dateText(log.createdAt)}</td></tr>)}</tbody>
          </table>
        </DataPanel>
      </section>
    </AdminPage>
  );
}

async function countSmokeLikeRows() {
  const [products, categories, customers, orders, payments, shipments, users] = await Promise.all([
    prisma.product.count({ where: { OR: [{ sku: { startsWith: "SMOKE-" } }, { sku: { startsWith: "UAT-SKU-" } }, { name: smokeNeedle }, { slug: uatNeedle }] } }),
    prisma.category.count({ where: { OR: [{ slug: { startsWith: "smoke-cat-" } }, { slug: { startsWith: "uat-cat-" } }, { name: smokeNeedle }] } }),
    prisma.customer.count({ where: { OR: [{ name: { startsWith: "Smoke " } }, { name: { startsWith: "UAT Customer " } }, { notes: smokeNeedle }, { notes: uatNeedle }] } }),
    prisma.order.count({ where: { OR: [{ note: smokeNeedle }, { note: uatNeedle }, { orderCode: { startsWith: "RPT" } }, { orderCode: { startsWith: "TRK" } }] } }),
    prisma.paymentTransaction.count({ where: { OR: [{ reference: { startsWith: "SMOKE" } }, { reference: { startsWith: "UAT-" } }, { note: smokeNeedle }, { note: uatNeedle }] } }),
    prisma.shipment.count({ where: { OR: [{ trackingCode: { startsWith: "TRK" } }, { trackingCode: { startsWith: "UATTRK" } }, { note: smokeNeedle }, { note: uatNeedle }] } }),
    prisma.user.count({ where: { status: { not: "ARCHIVED" }, OR: [{ email: { startsWith: "smoke-sales-" } }, { email: { startsWith: "smoke-auth-sales-" } }, { email: { startsWith: "smoke-inactive-" } }] } }),
  ]);
  const total = products + categories + customers + orders + payments + shipments + users;
  return { products, categories, customers, orders, payments, shipments, users, total };
}

function SnapshotRow({ label, value, note, href }: { label: string; value: string | number; note: string; href: string }) {
  return <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{label}</td><td className="px-4 py-3">{value}</td><td className="px-4 py-3 text-slate-600">{note}</td><td className="px-4 py-3"><a className="font-semibold text-emerald-700 hover:underline" href={href}>Open</a></td></tr>;
}

function CommandCard({ icon, title, command, description }: { icon: ReactNode; title: string; command: string; description: string }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2">{icon}<h2 className="font-semibold">{title}</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-950 p-3 text-sm text-white"><Terminal className="mt-0.5 size-4 shrink-0" /><code className="break-all">{command}</code></div></article>;
}

function UatChecklistItem({ title, details }: { title: string; details: string }) {
  return (
    <article className="border-t border-slate-100 p-4 md:border-r">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded border border-slate-300 bg-white" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{details}</p>
        </div>
      </div>
    </article>
  );
}

function automationTone(status: string): Tone {
  if (status === "OK") return "emerald";
  if (status === "WARN") return "amber";
  if (status === "ERROR") return "red";
  return "slate";
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function countLowStockRows() {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint as count
    FROM "Inventory" i
    JOIN "Product" p ON p.id = i."productId"
    WHERE p.status = 'ACTIVE' AND (i.quantity - i."reservedQuantity") <= p."minStock"
  `;
  return Number(rows[0]?.count || 0);
}

function dateText(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value);
}
