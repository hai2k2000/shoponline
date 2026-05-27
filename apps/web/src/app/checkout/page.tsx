import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <section className="mx-auto grid max-w-5xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">ShopOnline</p>
        <h1 className="text-3xl font-semibold">Thanh to?n</h1>
        <p className="text-slate-600">Nh?p th?ng tin kh?ch h?ng v? t?o ??n h?ng.</p>
        <Link className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold" href="/admin/dashboard">V? dashboard</Link>
      </section>
    </main>
  );
}
