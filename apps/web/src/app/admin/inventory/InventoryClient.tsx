"use client";

import { useMemo, useState } from "react";

type InventoryRow = {
  productId: string;
  name: string;
  sku: string;
  categoryName: string | null;
  costPrice: number;
  salePrice: number;
  minStock: number;
  status: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: string;
};

type TransactionRow = {
  id: string;
  productName: string;
  sku: string;
  type: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  note: string | null;
  createdAt: string;
};

type ModalState = { mode: "import" | "export" | "adjust"; row?: InventoryRow } | null;

export function InventoryClient({ rows, transactions, sessionToken }: { rows: InventoryRow[]; transactions: TransactionRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.name, row.sku, row.categoryName || ""].some((value) => value.toLowerCase().includes(term));
      const available = row.quantity - row.reservedQuantity;
      const matchesStock = !stockFilter || (stockFilter === "LOW" ? row.quantity <= row.minStock : stockFilter === "OUT" ? available <= 0 : true);
      return matchesTerm && matchesStock;
    });
  }, [query, rows, stockFilter]);

  const totalProducts = rows.length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const lowStock = rows.filter((row) => row.quantity <= row.minStock).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Kho</p>
            <h1 className="text-3xl font-semibold">Quản lý kho</h1>
            <p className="mt-1 text-sm text-slate-600">Nhập, xuất, điều chỉnh tồn và lịch sử giao dịch kho.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "import" })}>Nhập kho</button>
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" onClick={() => setModal({ mode: "export" })}>Xuất kho</button>
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" onClick={() => setModal({ mode: "adjust" })}>Điều chỉnh</button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Sản phẩm" value={totalProducts} />
          <Metric label="Tổng tồn" value={totalQuantity} />
          <Metric label="Giá trị kho" value={money(totalValue)} />
          <Metric label="Tồn thấp" value={lowStock} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, SKU, danh mục" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tình trạng
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="LOW">Tồn thấp</option>
              <option value="OUT">Hết khả dụng</option>
            </select>
          </label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Tồn</th><th className="px-4 py-3">Đang giữ</th><th className="px-4 py-3">Khả dụng</th><th className="px-4 py-3">Min</th><th className="px-4 py-3">Giá trị</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
              <tbody>
                {filtered.map((row) => {
                  const available = row.quantity - row.reservedQuantity;
                  return (
                    <tr key={row.productId} className="border-t border-slate-100">
                      <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 font-mono text-xs text-slate-500">{row.sku}</p></td>
                      <td className="px-4 py-3">{row.categoryName || "-"}</td>
                      <td className="px-4 py-3 font-semibold">{row.quantity}</td>
                      <td className="px-4 py-3">{row.reservedQuantity}</td>
                      <td className="px-4 py-3">{available}</td>
                      <td className="px-4 py-3">{row.minStock}</td>
                      <td className="px-4 py-3">{money(row.quantity * row.costPrice)}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "import", row })}>Nhập</button><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "export", row })}>Xuất</button><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "adjust", row })}>Điều chỉnh</button></div></td>
                    </tr>
                  );
                })}
                {!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={8}>Không có dữ liệu tồn kho phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4"><h2 className="text-lg font-semibold">Giao dịch gần đây</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">SL</th><th className="px-4 py-3">Trước</th><th className="px-4 py-3">Sau</th><th className="px-4 py-3">Ghi chú</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3"><strong>{item.productName}</strong><p className="font-mono text-xs text-slate-500">{item.sku}</p></td><td className="px-4 py-3">{viType(item.type)}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{item.beforeQuantity}</td><td className="px-4 py-3">{item.afterQuantity}</td><td className="px-4 py-3">{item.note || "-"}</td></tr>)}</tbody></table></div>
        </section>
      </div>
      {modal ? <InventoryModal modal={modal} products={rows} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function InventoryModal({ modal, products, sessionToken, onClose }: { modal: NonNullable<ModalState>; products: InventoryRow[]; sessionToken: string; onClose: () => void }) {
  const title = modal.mode === "import" ? "Nhập kho" : modal.mode === "export" ? "Xuất kho" : "Điều chỉnh tồn";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/inventory" method="post" className="grid w-full max-w-xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={modal.mode} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">{title}</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Sản phẩm<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="productId" defaultValue={modal.row?.productId || ""} required><option value="">Chọn sản phẩm</option>{products.map((item) => <option key={item.productId} value={item.productId}>{item.sku} - {item.name}</option>)}</select></label>
        {modal.mode === "adjust" ? <label className="grid gap-1 text-sm font-semibold text-slate-700">Tồn thực tế<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="actualQuantity" type="number" min="0" defaultValue={modal.row?.quantity || 0} required /></label> : <label className="grid gap-1 text-sm font-semibold text-slate-700">Số lượng<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="quantity" type="number" min="1" defaultValue={1} required /></label>}
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={3} placeholder={modal.mode === "export" ? "Lý do xuất kho" : "Ghi chú"} /></label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Lưu</button></div>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></article>;
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function viType(type: string) { return ({ IMPORT: "Nhập", EXPORT: "Xuất", ADJUST: "Điều chỉnh", RETURN: "Hoàn" } as Record<string, string>)[type] || type; }
