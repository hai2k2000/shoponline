"use client";

import { useMemo, useState } from "react";

type OrderOption = { id: string; orderCode: string; customer: string; orderStatus: string; total: number };
type ShipmentRow = {
  id: string;
  orderCode: string;
  customer: string;
  carrier: string;
  service: string | null;
  trackingCode: string | null;
  shippingFee: number;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

const statuses = ["PENDING", "PACKED", "SHIPPED", "DELIVERED", "FAILED", "RETURNED"];

export function ShipmentsClient({ rows, orders, sessionToken }: { rows: ShipmentRow[]; orders: OrderOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.orderCode, row.customer, row.carrier, row.service || "", row.trackingCode || "", row.note || ""].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (!status || row.status === status);
    });
  }, [query, rows, status]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Vận chuyển</p>
            <h1 className="text-3xl font-semibold">Quản lý vận đơn</h1>
            <p className="mt-1 text-sm text-slate-600">Theo dõi đơn vị giao hàng, mã vận đơn, trạng thái gửi và giao hàng.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModalOpen(true)}>Tạo vận đơn</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng vận đơn" value={rows.length} />
          <Metric label="Đang xử lý" value={rows.filter((row) => ["PENDING", "PACKED"].includes(row.status)).length} />
          <Metric label="Đang giao" value={rows.filter((row) => row.status === "SHIPPED").length} />
          <Metric label="Đã giao" value={rows.filter((row) => row.status === "DELIVERED").length} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã đơn, khách hàng, hãng giao, mã vận đơn" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viShipmentStatus(item)}</option>)}</select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Đơn vị giao</th><th className="px-4 py-3">Mã vận đơn</th><th className="px-4 py-3">Phí</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{row.orderCode}</strong><p className="text-xs text-slate-500">{row.note || ""}</p></td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{row.carrier}<p className="text-xs text-slate-500">{row.service || ""}</p></td><td className="px-4 py-3">{row.trackingCode || "-"}</td><td className="px-4 py-3">{money(row.shippingFee)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viShipmentStatus(row.status)}</span></td><td className="px-4 py-3">{row.shippedAt ? dateText(row.shippedAt) : "-"}</td><td className="px-4 py-3"><StatusButtons row={row} sessionToken={sessionToken} /></td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={8}>Chưa có vận đơn phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
      {modalOpen ? <ShipmentModal orders={orders} sessionToken={sessionToken} onClose={() => setModalOpen(false)} /> : null}
    </main>
  );
}

function ShipmentModal({ orders, sessionToken, onClose }: { orders: OrderOption[]; sessionToken: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/shipments" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Tạo vận đơn</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Đơn hàng<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="orderId">{orders.map((item) => <option key={item.id} value={item.id}>{item.orderCode} - {item.customer} - {viOrderStatus(item.orderStatus)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Đơn vị giao<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="carrier" placeholder="GHN, GHTK, Viettel Post..." /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Dịch vụ<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="service" placeholder="Nhanh, tiết kiệm..." /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã vận đơn<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="trackingCode" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Phí vận chuyển<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shippingFee" type="number" min={0} defaultValue={0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="status">{statuses.map((item) => <option key={item} value={item}>{viShipmentStatus(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Ngày gửi<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shippedAt" type="datetime-local" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={!orders.length}>Lưu vận đơn</button></div>
      </form>
    </div>
  );
}

function StatusButtons({ row, sessionToken }: { row: ShipmentRow; sessionToken: string }) {
  const next = row.status === "PENDING" ? ["PACKED", "SHIPPED"] : row.status === "PACKED" ? ["SHIPPED"] : row.status === "SHIPPED" ? ["DELIVERED", "FAILED", "RETURNED"] : [];
  return <div className="flex flex-wrap justify-end gap-2">{next.map((item) => <form key={item} action="/api/admin/shipments/status" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={item} /><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" type="submit">{viShipmentStatus(item)}</button></form>)}</div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
function viShipmentStatus(status: string) { return ({ PENDING: "Chờ xử lý", PACKED: "Đã đóng gói", SHIPPED: "Đã gửi", DELIVERED: "Đã giao", FAILED: "Giao lỗi", RETURNED: "Hoàn về" } as Record<string, string>)[status] || status; }
