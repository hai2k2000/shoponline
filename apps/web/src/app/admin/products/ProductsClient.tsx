"use client";

import { useMemo, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  thumbnail: string | null;
  costPrice: number;
  salePrice: number;
  promotionPrice: number | null;
  minStock: number;
  status: string;
  updatedAt: string;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  reservedQuantity: number;
};

type CategoryOption = { id: string; name: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: ProductRow } | null;
const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];

export function ProductsClient({ rows, categories, sessionToken }: { rows: ProductRow[]; categories: CategoryOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.name, row.sku, row.slug, row.categoryName || ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = !status || row.status === status;
      const matchesCategory = !categoryId || row.categoryId === categoryId;
      return matchesTerm && matchesStatus && matchesCategory;
    });
  }, [categoryId, query, rows, status]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Sản phẩm</p>
            <h1 className="text-3xl font-semibold">Quản lý sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-600">CRUD sản phẩm, SKU, giá, tồn kho ban đầu, danh mục và trạng thái.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "create" })}>Tạo sản phẩm</button>
        </header>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, SKU, slug, danh mục" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Tất cả</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}
            </select>
          </label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Giá vốn</th><th className="px-4 py-3">Giá bán</th><th className="px-4 py-3">Tồn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 text-xs text-slate-500">{row.shortDescription || row.slug}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                    <td className="px-4 py-3">{row.categoryName || "-"}</td>
                    <td className="px-4 py-3">{money(row.costPrice)}</td>
                    <td className="px-4 py-3"><strong>{money(row.salePrice)}</strong>{row.promotionPrice ? <p className="text-xs text-emerald-700">KM {money(row.promotionPrice)}</p> : null}</td>
                    <td className="px-4 py-3">{row.quantity}<p className="text-xs text-slate-500">Giữ: {row.reservedQuantity} · Min: {row.minStock}</p></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "edit", row })}>Sửa</button>{row.status !== "ARCHIVED" ? <form action="/api/admin/products/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ sản phẩm này?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700">Lưu trữ</button></form> : null}</div></td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={8}>Không có sản phẩm phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal ? <ProductModal modal={modal} categories={categories} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function ProductModal({ modal, categories, sessionToken, onClose }: { modal: ModalState; categories: CategoryOption[]; sessionToken: string; onClose: () => void }) {
  const row = modal?.mode === "edit" ? modal.row : null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action="/api/admin/products" method="post" className="grid max-h-[calc(100vh-32px)] w-full max-w-4xl gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={row ? "update" : "create"} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><h2 className="text-xl font-semibold">{row ? "Sửa sản phẩm" : "Tạo sản phẩm"}</h2><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button></div>
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên sản phẩm<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="name" defaultValue={row?.name || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">SKU<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="sku" defaultValue={row?.sku || ""} placeholder="Tự tạo nếu bỏ trống" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Slug<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="slug" defaultValue={row?.slug || ""} placeholder="Tự tạo nếu bỏ trống" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="categoryId" defaultValue={row?.categoryId || ""}><option value="">Chưa chọn</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá vốn<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="costPrice" type="number" min="0" defaultValue={row?.costPrice || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá bán<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="salePrice" type="number" min="0" defaultValue={row?.salePrice || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Giá khuyến mãi<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="promotionPrice" type="number" min="0" defaultValue={row?.promotionPrice || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tồn kho ban đầu<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="stockQuantity" type="number" min="0" defaultValue={row?.quantity || 0} disabled={Boolean(row)} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tồn tối thiểu<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="minStock" type="number" min="0" defaultValue={row?.minStock || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="status" defaultValue={row?.status || "DRAFT"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Mô tả ngắn<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="shortDescription" defaultValue={row?.shortDescription || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ảnh thumbnail URL<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="thumbnail" defaultValue={row?.thumbnail || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Mô tả chi tiết<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="description" rows={4} defaultValue={row?.description || ""} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button><button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Lưu</button></div>
      </form>
    </div>
  );
}

function viStatus(status: string) {
  return ({ ACTIVE: "Đang bán", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}
