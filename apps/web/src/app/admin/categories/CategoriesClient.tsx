"use client";

import { useMemo, useState } from "react";
import { archiveCategoryAction, createCategoryAction, updateCategoryAction } from "./actions";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  status: string;
  updatedAt: string;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
};

type ModalState = { mode: "create" } | { mode: "edit"; row: CategoryRow } | null;

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];

export function CategoriesClient({ rows }: { rows: CategoryRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.name, row.slug, row.parentName || ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = !status || row.status === status;
      return matchesTerm && matchesStatus;
    });
  }, [query, rows, status]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Danh mục</p>
            <h1 className="text-3xl font-semibold">Quản lý danh mục</h1>
            <p className="mt-1 text-sm text-slate-600">Danh mục nhiều cấp, sắp xếp, trạng thái và số lượng sản phẩm.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "create" })}>Tạo danh mục</button>
        </header>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, slug, danh mục cha" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả</option>
              {statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}
            </select>
          </label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tên</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Cha</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Thứ tự</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 text-xs text-slate-500">{row.description || "Chưa có mô tả"}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.slug}</td>
                    <td className="px-4 py-3">{row.parentName || "-"}</td>
                    <td className="px-4 py-3">{row.productCount}</td>
                    <td className="px-4 py-3">{row.sortOrder}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "edit", row })}>Sửa</button>
                        {row.status !== "ARCHIVED" ? (
                          <form action={archiveCategoryAction} onSubmit={(event) => { if (!confirm("Lưu trữ danh mục này?")) event.preventDefault(); }}>
                            <input type="hidden" name="id" value={row.id} />
                            <button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700">Lưu trữ</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Không có danh mục phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal ? <CategoryModal modal={modal} rows={rows} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function CategoryModal({ modal, rows, onClose }: { modal: ModalState; rows: CategoryRow[]; onClose: () => void }) {
  const row = modal?.mode === "edit" ? modal.row : null;
  const action = row ? updateCategoryAction : createCategoryAction;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form action={action} className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-xl font-semibold">{row ? "Sửa danh mục" : "Tạo danh mục"}</h2>
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button>
        </div>
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên danh mục<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="name" defaultValue={row?.name || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Slug<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="slug" defaultValue={row?.slug || ""} placeholder="Tự tạo nếu bỏ trống" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục cha<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="parentId" defaultValue={row?.parentId || ""}><option value="">Không có</option>{rows.filter((item) => item.id !== row?.id && item.status !== "ARCHIVED").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Thứ tự<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="sortOrder" type="number" defaultValue={row?.sortOrder || 0} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Mô tả<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="description" rows={3} defaultValue={row?.description || ""} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button>
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Lưu</button>
        </div>
      </form>
    </div>
  );
}

function viStatus(status: string) {
  return ({ ACTIVE: "Đang dùng", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status;
}
