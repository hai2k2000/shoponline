import { AdminPage, DataPanel, EmptyState, PageHeader, StatCard, StatusBadge, type Tone } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const jobLabels: Record<string, string> = {
  LOW_STOCK_ALERT: "Cảnh báo tồn thấp",
  PURCHASE_SUGGESTIONS: "Gợi ý nhập hàng",
  DEBT_REMINDERS: "Nhắc công nợ",
  ORDER_FOLLOWUP: "Theo dõi đơn hàng",
  DAILY_REPORT: "Báo cáo ngày",
};

export default async function AutomationPage() {
  const runs = await prisma.automationRun.findMany({ orderBy: { createdAt: "desc" }, take: 80 });
  const latestByJob = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!latestByJob.has(run.jobType)) latestByJob.set(run.jobType, run);
  }
  const latest = Array.from(latestByJob.values());
  const okCount = runs.filter((run) => run.status === "OK").length;
  const warnCount = runs.filter((run) => run.status === "WARN").length;
  const errorCount = runs.filter((run) => run.status === "ERROR").length;

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Automation" title="Tự động hóa vận hành" description="Theo dõi kết quả các job tự động: tồn thấp, gợi ý nhập hàng, nhắc công nợ, theo dõi đơn hàng và báo cáo ngày." action={<a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50" href="/api/admin/automation/export">Tai CSV</a>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tổng lần chạy" value={runs.length} hint="80 lần gần nhất" />
        <StatCard label="Job OK" value={okCount} tone="emerald" hint="Hoàn tất bình thường" />
        <StatCard label="Cảnh báo" value={warnCount} tone={warnCount ? "amber" : "slate"} hint="Cần rà soát" />
        <StatCard label="Lỗi" value={errorCount} tone={errorCount ? "red" : "slate"} hint="Cần xử lý" />
        <StatCard label="Loại job" value={latest.length} tone="blue" hint="Có dữ liệu gần nhất" />
      </section>

      {latest.length ? <section className="grid gap-4 lg:grid-cols-2">{latest.map((run) => <AutomationCard key={run.id} run={run} />)}</section> : null}

      <DataPanel>
        <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">Lịch sử chạy automation</h2></div>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tóm tắt</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Chi tiết</th></tr></thead>
          <tbody>{runs.map((run) => <tr key={run.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70"><td className="px-4 py-3 font-semibold">{jobLabels[run.jobType] || run.jobType}</td><td className="px-4 py-3"><AutomationStatus status={run.status} /></td><td className="px-4 py-3"><span className="line-clamp-2 max-w-3xl">{run.summary}</span></td><td className="px-4 py-3 whitespace-nowrap">{dateText(run.createdAt)}</td><td className="px-4 py-3"><AutomationDetails details={run.details} /></td></tr>)}</tbody>
        </table>
        {!runs.length ? <EmptyState title="Chưa có dữ liệu automation" description="Chạy npm run automation:run để tạo dữ liệu đầu tiên cho các job vận hành tự động." /> : null}
      </DataPanel>
    </AdminPage>
  );
}

function AutomationCard({ run }: { run: { jobType: string; status: string; summary: string; createdAt: Date; details: unknown } }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{jobLabels[run.jobType] || run.jobType}</h2><AutomationStatus status={run.status} /></div><p className="mt-3 text-sm leading-6 text-slate-700">{run.summary}</p><p className="mt-2 text-xs text-slate-500">{dateText(run.createdAt)}</p><pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(run.details || {}, null, 2)}</pre></article>;
}
function AutomationDetails({ details }: { details: unknown }) {
  return <details className="group max-w-md"><summary className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">Xem JSON</summary><pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(details || {}, null, 2)}</pre></details>;
}
function AutomationStatus({ status }: { status: string }) { return <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>; }
function statusTone(status: string): Tone { return status === "OK" ? "emerald" : status === "WARN" ? "amber" : status === "ERROR" ? "red" : "slate"; }
function dateText(value: Date) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value); }
