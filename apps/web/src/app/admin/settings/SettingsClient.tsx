"use client";

import { AdminPage, Button, Field, inputClass, PageHeader, StatCard, textareaClass } from "@/components/admin/ui";

type SettingRow = { storeName: string; logo: string | null; phone: string | null; email: string | null; address: string | null; shippingFee: number; inventoryStrategy: string };

export function SettingsClient({ setting, sessionToken }: { setting: SettingRow; sessionToken: string }) {
  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Cài đặt" title="Cài đặt cửa hàng" description="Thông tin thương hiệu, liên hệ, phí giao hàng mặc định và chính sách tồn kho áp dụng toàn hệ thống." />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tên cửa hàng" value={setting.storeName} hint="Hiển thị trên storefront" />
        <StatCard label="Phí giao hàng" value={money(setting.shippingFee)} tone="blue" hint="Mặc định khi checkout" />
        <StatCard label="Chính sách tồn kho" value={setting.inventoryStrategy === "PREVENT_NEGATIVE" ? "Chặn âm kho" : "Cho bán âm"} tone={setting.inventoryStrategy === "PREVENT_NEGATIVE" ? "emerald" : "amber"} hint="Ảnh hưởng đơn hàng mới" />
      </section>

      <form action="/api/admin/settings" method="post" className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <section className="grid gap-3 md:grid-cols-2">
          <Field label="Tên cửa hàng"><input required className={inputClass} name="storeName" defaultValue={setting.storeName} /></Field>
          <Field label="Logo URL"><input className={inputClass} name="logo" defaultValue={setting.logo || ""} placeholder="https://..." /></Field>
          <Field label="Số điện thoại"><input className={inputClass} name="phone" defaultValue={setting.phone || ""} /></Field>
          <Field label="Email"><input className={inputClass} name="email" type="email" defaultValue={setting.email || ""} /></Field>
          <Field label="Phí giao hàng mặc định"><input className={inputClass} name="shippingFee" type="number" min={0} defaultValue={setting.shippingFee} /></Field>
          <Field label="Chính sách tồn kho"><select className={inputClass} name="inventoryStrategy" defaultValue={setting.inventoryStrategy}><option value="PREVENT_NEGATIVE">Không cho bán âm kho</option><option value="ALLOW_NEGATIVE">Cho phép bán âm kho</option></select></Field>
          <Field label="Địa chỉ" wide><textarea className={textareaClass} name="address" rows={3} defaultValue={setting.address || ""} /></Field>
        </section>
        <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit">Lưu cài đặt</Button></div>
      </form>
    </AdminPage>
  );
}

function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
