import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-950">
      <section className="grid w-full max-w-md gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-emerald-700">ShopOnline Admin</p>
          <h1 className="text-3xl font-semibold">??ng nh?p qu?n tr?</h1>
          <p className="text-sm text-slate-600">D?ng t?i kho?n admin ?? seed ?? v?o h? th?ng.</p>
        </div>
        <LoginForm />
        <Link className="text-sm font-semibold text-slate-600" href="/">V? website</Link>
      </section>
    </main>
  );
}
