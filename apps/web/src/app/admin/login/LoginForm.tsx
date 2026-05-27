"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: "" });

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Email
        <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600" name="email" type="email" defaultValue="admin@shoponline.local" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        M?t kh?u
        <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600" name="password" type="password" defaultValue="ShopOnline@2026" required />
      </label>
      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p> : null}
      <button className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "?ang ??ng nh?p..." : "??ng nh?p"}</button>
    </form>
  );
}
