import Link from "next/link";

const sections = ["Danh m?c", "S?n ph?m n?i b?t", "S?n ph?m m?i", "B?n ch?y", "Khuy?n m?i"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
        <div className="flex flex-col justify-center gap-6">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-700">ShopOnline Business Hub</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">N?n t?ng b?n h?ng online v? v?n h?nh doanh nghi?p</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">Qu?n l? s?n ph?m, kho, ??n h?ng, kh?ch h?ng, t?i ch?nh v? b?o c?o trong m?t h? th?ng c? th? m? r?ng automation v? AI.</p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/products">Xem s?n ph?m</Link>
            <Link className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold" href="/admin/dashboard">V?o qu?n tr?</Link>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {sections.map((item) => (
            <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-4 font-medium">{item}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
