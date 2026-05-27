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

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">Admin / Automation</p>
          <h1 className="text-3xl font-semibold">Tự động hóa vận hành</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi kết quả các job tự động: tồn thấp, công nợ, đơn hàng và báo cáo ngày.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <Metric label="Tổng lần chạy" value={runs.length} />
          <Metric label="Job OK" value={runs.filter((run) => run.status === "OK").length} />
          <Metric label="Cảnh báo" value={runs.filter((run) => run.status === "WARN").length} />
          <Metric label="Lỗi" value={runs.filter((run) => run.status === "ERROR").length} />
          <Metric label="Loại job" value={latest.length} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {latest.map((run) => <AutomationCard key={run.id} run={run} />)}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">Lịch sử chạy automation</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Job</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tóm tắt</th><th className="px-4 py-3">Thời gian</th></tr></thead>
              <tbody>{runs.map((run) => <tr key={run.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">{jobLabels[run.jobType] || run.jobType}</td><td className="px-4 py-3"><Status status={run.status} /></td><td className="px-4 py-3">{run.summary}</td><td className="px-4 py-3">{dateText(run.createdAt)}</td></tr>)}{!runs.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={4}>Chưa có dữ liệu automation. Chạy npm run automation:run để tạo dữ liệu đầu tiên.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function AutomationCard({ run }: { run: { jobType: string; status: string; summary: string; createdAt: Date; details: unknown } }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{jobLabels[run.jobType] || run.jobType}</h2><Status status={run.status} /></div><p className="mt-3 text-sm text-slate-700">{run.summary}</p><p className="mt-2 text-xs text-slate-500">{dateText(run.createdAt)}</p><pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(run.details || {}, null, 2)}</pre></article>;
}
function Status({ status }: { status: string }) { const color = status === "OK" ? "bg-emerald-50 text-emerald-700" : status === "WARN" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{status}</span>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function dateText(value: Date) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value); }
