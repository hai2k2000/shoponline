import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  description: "Đăng nhập hệ thống quản trị ShopOnline.",
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-950">
      <section className="grid w-full max-w-md gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-emerald-700">ShopOnline Admin</p>
          <h1 className="text-3xl font-semibold">Đăng nhập quản trị</h1>
          <p className="text-sm text-slate-600">Dùng tài khoản quản trị để vào hệ thống vận hành.</p>
        </div>
        <LoginForm />
        <Link className="text-sm font-semibold text-slate-600" href="/">Về website</Link>
      </section>
    </main>
  );
}
