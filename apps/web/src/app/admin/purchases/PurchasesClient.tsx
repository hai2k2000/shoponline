"use client";

import { useMemo, useState } from "react";

type SupplierOption = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string; costPrice: number };
type PurchaseRow = {
  id: string;
  code: string;
  supplier: string;
  status: string;
  total: number;
  expectedAt: string | null;
  receivedAt: string | null;
  note: string | null;
  items: { productName: string; sku: string | null; quantity: number; costPrice: number; total: number }[];
};

const statuses = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"];

export function PurchasesClient({ rows, suppliers, products, sessionToken }: { rows: PurchaseRow[]; suppliers: SupplierOption[]; products: ProductOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<"create" | null>(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.code, row.supplier, row.note || "", ...row.items.map((item) => item.productName)].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (!status || row.status === status);
    });
  }, [query, rows, status]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Kho hàng</p>
            <h1 className="text-3xl font-semibold">Đơn nhập hàng</h1>
            <p className="mt-1 text-sm text-slate-600">Lập phiếu nhập từ nhà cung cấp và nhận hàng vào tồn kho.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal("create")}>Tạo đơn nhập</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng đơn nhập" value={rows.length} />
          <Metric label="Đã đặt" value={rows.filter((row) => row.status === "ORDERED").length} />
          <Metric label="Đã nhận" value={rows.filter((row) => row.status === "RECEIVED").length} />
          <Metric label="Giá trị đã nhận" value={money(rows.filter((row) => row.status === "RECEIVED").reduce((sum, row) => sum + row.total, 0))} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã nhập, nhà cung cấp, sản phẩm" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Mã nhập</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Dự kiến</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3"><strong>{row.code}</strong><p className="text-xs text-slate-500">{row.note || ""}</p></td><td className="px-4 py-3">{row.supplier}</td><td className="px-4 py-3">{row.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}</td><td className="px-4 py-3 font-semibold">{money(row.total)}</td><td className="px-4 py-3">{row.expectedAt ? dateText(row.expectedAt) : "-"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td><td className="px-4 py-3"><PurchaseActions row={row} sessionToken={sessionToken} /></td></tr>)}{!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Chưa có đơn nhập phù hợp.</td></tr> : null}</tbody>
            </table>
          </div>
        </section>
      </div>
      {modal ? <PurchaseModal suppliers={suppliers} products={products} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function PurchaseModal({ suppliers, products, sessionToken, onClose }: { suppliers: SupplierOption[]; products: ProductOption[]; sessionToken: string; onClose: () => void }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [shippingFee, setShippingFee] = useState(0);
  const product = products.find((item) => item.id === productId);
  const subtotal = (product?.costPrice || 0) * quantity;
  const total = subtotal + shippingFee;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/purchases" method="post" className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">Tạo đơn nhập</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Nhà cung cấp<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="supplierId"><option value="">Chưa chọn</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Sản phẩm<select required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="productId" value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.sku}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Số lượng<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá nhập<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="costPrice" type="number" min={0} defaultValue={product?.costPrice || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Phí vận chuyển<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shippingFee" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(Math.max(0, Number(event.target.value || 0)))} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Ngày dự kiến<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="expectedAt" type="date" /></label>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Tạm tính</span><strong className="mt-1 block text-xl">{money(total)}</strong></div>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={!products.length}>Lưu đơn nhập</button></div>
      </form>
    </div>
  );
}

function PurchaseActions({ row, sessionToken }: { row: PurchaseRow; sessionToken: string }) {
  if (["RECEIVED", "CANCELLED"].includes(row.status)) return null;
  return <div className="flex flex-wrap justify-end gap-2"><form action="/api/admin/purchases/status" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="RECEIVED" /><button className="rounded-lg border border-emerald-200 px-3 py-2 font-semibold text-emerald-700" type="submit">Nhận hàng</button></form><form action="/api/admin/purchases/status" method="post"><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700" type="submit">Huỷ</button></form></div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value)); }
function viStatus(status: string) { return ({ DRAFT: "Nháp", ORDERED: "Đã đặt", RECEIVED: "Đã nhận", CANCELLED: "Đã huỷ" } as Record<string, string>)[status] || status; }
