"use client";

import { useMemo, useState, useTransition } from "react";
import { createOrderAction, updateOrderStatusAction } from "./actions";

type OrderItemRow = { productName: string; sku: string | null; quantity: number; salePrice: number; total: number };
type OrderRow = {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  note: string | null;
  createdAt: string;
  items: OrderItemRow[];
};
type CustomerOption = { id: string; name: string; phone: string | null };
type ProductOption = { id: string; name: string; sku: string; salePrice: number; available: number };
type ModalState = { mode: "create" } | { mode: "detail"; row: OrderRow } | null;

const orderStatuses = ["NEW", "CONFIRMED", "PACKING", "SHIPPING", "COMPLETED", "CANCELLED", "RETURNED"];

export function OrdersClient({ rows, customers, products }: { rows: OrderRow[]; customers: CustomerOption[]; products: ProductOption[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.orderCode, row.customerName, row.note || ""].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (!status || row.orderStatus === status);
    });
  }, [query, rows, status]);

  const openOrders = rows.filter((row) => !["COMPLETED", "CANCELLED", "RETURNED"].includes(row.orderStatus)).length;
  const completedRevenue = rows.filter((row) => row.orderStatus === "COMPLETED").reduce((sum, row) => sum + row.total, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Đơn hàng</p>
            <h1 className="text-3xl font-semibold">Quản lý đơn hàng</h1>
            <p className="mt-1 text-sm text-slate-600">Tạo đơn, giữ tồn kho, theo dõi trạng thái và hoàn tất xuất kho.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "create" })}>Tạo đơn hàng</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng đơn" value={rows.length} />
          <Metric label="Đơn đang xử lý" value={openOrders} />
          <Metric label="Đơn hoàn tất" value={rows.filter((row) => row.orderStatus === "COMPLETED").length} />
          <Metric label="Doanh thu hoàn tất" value={money(completedRevenue)} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã đơn, khách hàng, ghi chú" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{orderStatuses.map((item) => <option key={item} value={item}>{viOrderStatus(item)}</option>)}</select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3"><strong>{row.orderCode}</strong><p className="mt-1 text-xs text-slate-500">{dateText(row.createdAt)}</p></td>
                    <td className="px-4 py-3">{row.customerName}<p className="mt-1 text-xs text-slate-500">{row.note || ""}</p></td>
                    <td className="px-4 py-3">{row.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}</td>
                    <td className="px-4 py-3 font-semibold">{money(row.total)}</td>
                    <td className="px-4 py-3">{viPayment(row.paymentStatus)}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viOrderStatus(row.orderStatus)}</span></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "detail", row })}>Xem</button><StatusButtons row={row} /></div></td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Không có đơn hàng phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal?.mode === "detail" ? <OrderDetail row={modal.row} onClose={() => setModal(null)} /> : modal ? <OrderModal customers={customers} products={products} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function OrderModal({ customers, products, onClose }: { customers: CustomerOption[]; products: ProductOption[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const product = products.find((item) => item.id === productId);
  const subtotal = (product?.salePrice || 0) * quantity;
  const total = Math.max(0, subtotal + shippingFee - discount);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); startTransition(async () => { await createOrderAction(formData); window.location.reload(); }); }} className="grid w-full max-w-3xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xl font-semibold">Tạo đơn hàng</h2>
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Khách hàng<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="customerId"><option value="">Khách lẻ</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Sản phẩm<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="productId" value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} - còn {item.available}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Số lượng<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="quantity" type="number" min={1} max={Math.max(1, product?.available || 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Phí vận chuyển<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shippingFee" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(Math.max(0, Number(event.target.value || 0)))} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giảm giá<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="discount" type="number" min={0} value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value || 0)))} /></label>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Tạm tính</span><strong className="mt-1 block text-xl">{money(total)}</strong></div>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button>
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending || !products.length}>{pending ? "Đang tạo..." : "Tạo đơn"}</button>
        </div>
      </form>
    </div>
  );
}

function StatusButtons({ row }: { row: OrderRow }) {
  const [pending, startTransition] = useTransition();
  const setStatus = (status: string) => {
    if (["CANCELLED", "RETURNED"].includes(status) && !confirm("Xác nhận đổi trạng thái đơn hàng?")) return;
    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("status", status);
    startTransition(async () => { await updateOrderStatusAction(formData); window.location.reload(); });
  };
  if (["CANCELLED", "RETURNED"].includes(row.orderStatus)) return null;
  if (row.orderStatus === "COMPLETED") return <button className="rounded-lg border border-orange-200 px-3 py-2 font-semibold text-orange-700 disabled:opacity-60" disabled={pending} onClick={() => setStatus("RETURNED")}>Trả hàng</button>;
  return (
    <>
      {row.orderStatus === "NEW" ? <button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-60" disabled={pending} onClick={() => setStatus("CONFIRMED")}>Xác nhận</button> : null}
      {["NEW", "CONFIRMED", "PACKING", "SHIPPING"].includes(row.orderStatus) ? <button className="rounded-lg border border-emerald-200 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-60" disabled={pending} onClick={() => setStatus("COMPLETED")}>Hoàn tất</button> : null}
      {["NEW", "CONFIRMED", "PACKING"].includes(row.orderStatus) ? <button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 disabled:opacity-60" disabled={pending} onClick={() => setStatus("CANCELLED")}>Huỷ</button> : null}
    </>
  );
}

function OrderDetail({ row, onClose }: { row: OrderRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">{row.orderCode}</h2><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Khách hàng" value={row.customerName} />
          <Info label="Trạng thái" value={viOrderStatus(row.orderStatus)} />
          <Info label="Thanh toán" value={viPayment(row.paymentStatus)} />
          <Info label="Tổng tiền" value={money(row.total)} />
          <Info label="Ghi chú" value={row.note || "-"} wide />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Sản phẩm</th><th className="px-3 py-2">SL</th><th className="px-3 py-2">Đơn giá</th><th className="px-3 py-2">Thành tiền</th></tr></thead><tbody>{row.items.map((item) => <tr key={`${item.productName}-${item.sku}`} className="border-t border-slate-100"><td className="px-3 py-2">{item.productName}<p className="text-xs text-slate-500">{item.sku || ""}</p></td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2">{money(item.salePrice)}</td><td className="px-3 py-2">{money(item.total)}</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return <div className={`rounded-xl bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>;
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viPayment(status: string) { return ({ UNPAID: "Chưa thanh toán", PARTIAL: "Thanh toán một phần", PAID: "Đã thanh toán", REFUNDED: "Đã hoàn tiền" } as Record<string, string>)[status] || status; }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
