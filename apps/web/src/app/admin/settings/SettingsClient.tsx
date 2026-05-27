"use client";

import { useTransition } from "react";
import { updateStoreSettingAction } from "./actions";

type SettingRow = { storeName: string; logo: string | null; phone: string | null; email: string | null; address: string | null; shippingFee: number; inventoryStrategy: string };

export function SettingsClient({ setting }: { setting: SettingRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header>
          <p className="text-sm font-semibold text-emerald-700">Admin / Cài đặt</p>
          <h1 className="text-3xl font-semibold">Cài đặt cửa hàng</h1>
          <p className="mt-1 text-sm text-slate-600">Thông tin thương hiệu, liên hệ, phí giao hàng và chính sách tồn kho.</p>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); startTransition(async () => { await updateStoreSettingAction(formData); window.location.reload(); }); }} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <section className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên cửa hàng<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="storeName" defaultValue={setting.storeName} /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Logo URL<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="logo" defaultValue={setting.logo || ""} placeholder="https://..." /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Số điện thoại<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="phone" defaultValue={setting.phone || ""} /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Email<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="email" type="email" defaultValue={setting.email || ""} /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Phí giao hàng mặc định<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shippingFee" type="number" min={0} defaultValue={setting.shippingFee} /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Chính sách tồn kho<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="inventoryStrategy" defaultValue={setting.inventoryStrategy}><option value="PREVENT_NEGATIVE">Không cho bán âm kho</option><option value="ALLOW_NEGATIVE">Cho phép bán âm kho</option></select></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Địa chỉ<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="address" rows={3} defaultValue={setting.address || ""} /></label>
          </section>
          <div className="flex justify-end border-t border-slate-100 pt-4"><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "Đang lưu..." : "Lưu cài đặt"}</button></div>
        </form>
      </div>
    </main>
  );
}
