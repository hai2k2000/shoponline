"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";
import { ProductGalleryPanel } from "./ProductGalleryPanel";

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
  images: { id: string; imageUrl: string; sortOrder: number }[];
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string | null;
};

type CategoryOption = { id: string; name: string };
type ModalState = { mode: "create" } | { mode: "edit"; row: ProductRow } | { mode: "detail"; row: ProductRow } | null;
type SortKey = "updatedAt" | "name" | "sku" | "salePrice" | "quantity" | "status";

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];
const pageSize = 12;

export function ProductsClient({ rows, categories, sessionToken, initialQuery = "", initialCategoryId = "" }: { rows: ProductRow[]; categories: CategoryOption[]; sessionToken: string; initialQuery?: string; initialCategoryId?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [stockFilter, setStockFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const available = row.quantity - row.reservedQuantity;
        const matchesTerm = !term || [row.name, row.sku, row.slug, row.categoryName || "", row.shortDescription || ""].some((value) => value.toLowerCase().includes(term));
        const matchesStatus = !status || row.status === status;
        const matchesCategory = !categoryId || row.categoryId === categoryId;
        const matchesStock = !stockFilter || (stockFilter === "low" ? row.quantity <= row.minStock : stockFilter === "available" ? available > 0 : available <= 0);
        return matchesTerm && matchesStatus && matchesCategory && matchesStock;
      })
      .sort((left, right) => compareProducts(left, right, sortKey, sortDirection));
  }, [categoryId, query, rows, sortDirection, sortKey, status, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedRows = filtered.filter((row) => selectedIds.has(row.id));
  const selectedVisibleCount = visibleRows.filter((row) => selectedIds.has(row.id)).length;
  const allVisibleSelected = Boolean(visibleRows.length) && selectedVisibleCount === visibleRows.length;
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const lowStockCount = rows.filter((row) => row.quantity <= row.minStock).length;
  const inventoryValue = rows.reduce((sum, row) => sum + row.costPrice * row.quantity, 0);
  const reservedCount = rows.reduce((sum, row) => sum + row.reservedQuantity, 0);

  function resetPage() {
    setPage(1);
  }

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleRows() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleRows.forEach((row) => next.delete(row.id));
      else visibleRows.forEach((row) => next.add(row.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Kho và hàng hóa / Sản phẩm"
        title="Quản lý sản phẩm"
        description="Quản lý catalog, SKU, giá bán, trạng thái hiển thị và tồn kho ban đầu cho luồng bán hàng."
        action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo sản phẩm</Button>}
      />

      {initialQuery || initialCategoryId ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Đang mở từ liên kết nhanh. Bộ lọc đã được áp dụng theo {initialQuery ? `từ khóa "${initialQuery}"` : "danh mục đã chọn"}.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng sản phẩm" value={rows.length} hint={`${activeCount} đang bán`} />
        <StatCard label="Tồn thấp" value={lowStockCount} tone={lowStockCount ? "amber" : "emerald"} hint="Số lượng <= tồn tối thiểu" />
        <StatCard label="Đang giữ hàng" value={reservedCount} tone={reservedCount ? "blue" : "slate"} hint="Reserved cho đơn chưa hoàn tất" />
        <StatCard label="Giá trị tồn kho" value={money(inventoryValue)} tone="emerald" hint="Theo giá vốn hiện tại" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} sản phẩm`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên, SKU, slug, danh mục" />
        <SelectField label="Danh mục" value={categoryId} onChange={(value) => { setCategoryId(value); resetPage(); }}><option value="">Tất cả</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}><option value="">Tất cả</option>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</SelectField>
        <SelectField label="Tồn kho" value={stockFilter} onChange={(value) => { setStockFilter(value); resetPage(); }}><option value="">Tất cả</option><option value="available">Còn bán được</option><option value="low">Tồn thấp</option><option value="out">Hết khả dụng</option></SelectField>
      </FilterBar>

      <ProductBulkBar categoryId={categoryId} filteredRows={filtered} query={query} selectedRows={selectedRows} status={status} stockFilter={stockFilter} onClear={clearSelection} />

      <DataPanel>
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-blue-50 text-blue-900">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  aria-label="Chọn tất cả sản phẩm trên trang"
                  checked={allVisibleSelected}
                  className="size-4 rounded border-slate-300"
                  onChange={toggleVisibleRows}
                  type="checkbox"
                />
              </th>
              <SortableTh label="Sản phẩm" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="SKU" active={sortKey === "sku"} direction={sortDirection} onClick={() => toggleSort("sku", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Danh mục</th>
              <th className="px-4 py-3 font-semibold">Giá vốn</th>
              <SortableTh label="Giá bán" active={sortKey === "salePrice"} direction={sortDirection} onClick={() => toggleSort("salePrice", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Tồn" active={sortKey === "quantity"} direction={sortDirection} onClick={() => toggleSort("quantity", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Cập nhật" active={sortKey === "updatedAt"} direction={sortDirection} onClick={() => toggleSort("updatedAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const available = row.quantity - row.reservedQuantity;
              return (
                <tr key={row.id} className="border-t border-blue-50 align-top hover:bg-blue-50/50">
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Chọn sản phẩm ${row.name}`}
                      checked={selectedIds.has(row.id)}
                      className="size-4 rounded border-slate-300"
                      onChange={() => toggleRow(row.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 max-w-72 truncate text-xs text-slate-500">{row.shortDescription || row.slug}</p></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                  <td className="px-4 py-3">{row.categoryName || "-"}</td>
                  <td className="px-4 py-3">{money(row.costPrice)}</td>
                  <td className="px-4 py-3"><strong>{money(row.salePrice)}</strong>{row.promotionPrice ? <p className="text-xs font-semibold text-blue-600">KM {money(row.promotionPrice)}</p> : null}</td>
                  <td className="px-4 py-3"><StatusBadge tone={stockTone(row)}>{available} khả dụng</StatusBadge><p className="mt-1 text-xs text-slate-500">Tổng {row.quantity} · Giữ {row.reservedQuantity} · Min {row.minStock}</p></td>
                  <td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{dateText(row.updatedAt)}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><a className="inline-flex min-h-9 items-center rounded-lg border border-blue-200 bg-white px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50" href={inventoryHref(row)}>Tồn kho</a><a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50" href={purchaseHref(row)}><PackagePlus className="size-4" />Nhập</a><button className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={() => setModal({ mode: "detail", row })}>Xem</button><button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={() => setModal({ mode: "edit", row })}><Pencil className="size-4" />Sửa</button>{row.status !== "ARCHIVED" ? <ArchiveButton row={row} sessionToken={sessionToken} /> : null}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có sản phẩm phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo sản phẩm mới." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "detail" ? <ProductDetail row={modal.row} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "create" || modal?.mode === "edit" ? <ProductModal modal={modal} categories={categories} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function ProductBulkBar({ categoryId, filteredRows, query, selectedRows, status, stockFilter, onClear }: { categoryId: string; filteredRows: ProductRow[]; query: string; selectedRows: ProductRow[]; status: string; stockFilter: string; onClear: () => void }) {
  const activeRows = selectedRows.length ? selectedRows : filteredRows;
  const firstRow = activeRows[0];
  const totalAvailable = activeRows.reduce((sum, row) => sum + row.quantity - row.reservedQuantity, 0);
  const totalValue = activeRows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const lowStock = activeRows.filter((row) => row.quantity - row.reservedQuantity <= row.minStock).length;
  const label = selectedRows.length ? `${selectedRows.length} sản phẩm đã chọn` : `${filteredRows.length} sản phẩm đang lọc`;
  const exportHref = productExportHref(query, categoryId, status, stockFilter);

  if (!filteredRows.length) return null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-1">
        <strong className="text-sm">{label}</strong>
        <p className="text-xs font-semibold text-slate-500">
          Khả dụng {totalAvailable} · Tồn thấp {lowStock} · Giá trị {money(totalValue)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {firstRow ? (
          <>
            <a className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={inventoryHref(firstRow)}>Mở tồn kho mã đầu</a>
            <a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={purchaseHref(firstRow)}><PackagePlus className="size-4" />Nhập mã đầu</a>
          </>
        ) : null}
        <button
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          onClick={() => exportProductsCsv(activeRows)}
          type="button"
        >
          <Download className="size-4" />
          Xuất CSV
        </button>
        <a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={exportHref}>
          <Download className="size-4" />
          Tải CSV
        </a>
        {selectedRows.length ? <button className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={onClear} type="button">Bỏ chọn</button> : null}
      </div>
    </section>
  );
}

function ProductDetail({ row, sessionToken, onClose }: { row: ProductRow; sessionToken: string; onClose: () => void }) {
  const [tab, setTab] = React.useState<"info" | "gallery">("info");
  const available = row.quantity - row.reservedQuantity;
  const productInventoryHref = inventoryHref(row);
  const productPurchaseHref = purchaseHref(row);
  const categoryHref = row.categoryId ? `/admin/categories?search=${encodeURIComponent(row.categoryName || "")}` : "/admin/categories";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{row.name}</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="flex gap-2 border-b border-slate-100 px-5 pt-2">
          <button onClick={() => setTab("info")} className={"px-4 py-2 text-sm font-semibold border-b-2 " + (tab === "info" ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700")}>Thông tin</button>
          <button onClick={() => setTab("gallery")} className={"px-4 py-2 text-sm font-semibold border-b-2 " + (tab === "gallery" ? "border-slate-800 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700")}>
            Ảnh gallery {row.images.length > 0 ? <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">{row.images.length}</span> : null}
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-5">
          {tab === "info" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={productInventoryHref}>Mở tồn kho</a>
                <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={productPurchaseHref}>Tạo đơn nhập</a>
                <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={categoryHref}>Mở danh mục</a>
              </div>
              <section className="grid gap-3 md:grid-cols-3">
                <Info label="SKU" value={row.sku} />
                <Info label="Slug" value={row.slug} />
                <Info label="Danh mục" value={row.categoryName || "-"} />
                <Info label="Giá vốn" value={money(row.costPrice)} />
                <Info label="Giá bán" value={money(row.salePrice)} />
                <Info label="Giá khuyến mãi" value={row.promotionPrice ? money(row.promotionPrice) : "-"} />
                <Info label="Tồn tổng" value={row.quantity} />
                <Info label="Đang giữ" value={row.reservedQuantity} />
                <Info label="Khả dụng" value={available} />
                <Info label="Tồn tối thiểu" value={row.minStock} />
                <Info label="Trạng thái" value={viStatus(row.status)} />
                <Info label="Cập nhật" value={dateTimeText(row.updatedAt)} />
              </section>
              <section className="grid gap-3">
                <Info label="Mô tả ngắn" value={row.shortDescription || "-"} wide />
                <Info label="Thumbnail URL" value={row.thumbnail || "-"} wide />
                <Info label="Mô tả chi tiết" value={row.description || "-"} wide />
                <Info label="Meta Title" value={row.metaTitle || "-"} wide />
                <Info label="Meta Description" value={row.metaDescription || "-"} wide />
                <Info label="Tags" value={row.tags || "-"} wide />
              </section>
            </>
          ) : (
            <ProductGalleryPanel productId={row.id} images={row.images} sessionToken={sessionToken} />
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-3" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block break-words text-sm text-slate-900">{value}</strong></div>;
}

function ProductModal({ modal, categories, sessionToken, onClose }: { modal: Extract<ModalState, { mode: "create" } | { mode: "edit"; row: ProductRow }>; categories: CategoryOption[]; sessionToken: string; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/products" method="post" className="grid max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={row ? "update" : "create"} />
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{row ? "Sửa sản phẩm" : "Tạo sản phẩm"}</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="grid gap-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tên sản phẩm"><input required className={inputClass} name="name" defaultValue={row?.name || ""} /></Field>
            <Field label="SKU"><input className={inputClass} name="sku" defaultValue={row?.sku || ""} placeholder="Tự tạo nếu bỏ trống" /></Field>
            <Field label="Slug"><input className={inputClass} name="slug" defaultValue={row?.slug || ""} placeholder="Tự tạo nếu bỏ trống" /></Field>
            <Field label="Danh mục"><select className={inputClass} name="categoryId" defaultValue={row?.categoryId || ""}><option value="">Chưa chọn</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Giá vốn"><input className={inputClass} name="costPrice" type="number" min="0" defaultValue={row?.costPrice || 0} /></Field>
            <Field label="Giá bán"><input className={inputClass} name="salePrice" type="number" min="0" defaultValue={row?.salePrice || 0} /></Field>
            <Field label="Giá khuyến mãi"><input className={inputClass} name="promotionPrice" type="number" min="0" defaultValue={row?.promotionPrice || ""} /></Field>
            <Field label="Tồn kho ban đầu"><input className={inputClass} name="stockQuantity" type="number" min="0" defaultValue={row?.quantity || 0} disabled={Boolean(row)} /></Field>
            <Field label="Tồn tối thiểu"><input className={inputClass} name="minStock" type="number" min="0" defaultValue={row?.minStock || 0} /></Field>
            <Field label="Trạng thái"><select className={inputClass} name="status" defaultValue={row?.status || "DRAFT"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></Field>
            <Field label="Mô tả ngắn" wide><input className={inputClass} name="shortDescription" defaultValue={row?.shortDescription || ""} /></Field>
            <Field label="Ảnh thumbnail URL" wide><input className={inputClass} name="thumbnail" defaultValue={row?.thumbnail || ""} /></Field>
            <Field label="Mô tả chi tiết" wide><textarea className={textareaClass} name="description" rows={4} defaultValue={row?.description || ""} /></Field>
            <Field label="Meta Title (SEO)" wide><input className={inputClass} name="metaTitle" defaultValue={row?.metaTitle || ""} placeholder="Tiêu đề hiển thị trên Google (mặc định dùng tên sản phẩm)" /></Field>
            <Field label="Meta Description (SEO)" wide><textarea className={textareaClass} name="metaDescription" rows={2} defaultValue={row?.metaDescription || ""} placeholder="Mô tả ngắn hiển thị trên Google (tối đa 160 ký tự)" /></Field>
            <Field label="Tags (phân cách bằng dấu phẩy)" wide><input className={inputClass} name="tags" defaultValue={row?.tags || ""} placeholder="yoga, sức khỏe, thể thao" /></Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit">Lưu</Button></div>
      </form>
    </div>
  );
}

function ArchiveButton({ row, sessionToken }: { row: ProductRow; sessionToken: string }) {
  return (
    <form action="/api/admin/products/archive" method="post" onSubmit={(event) => { if (!confirm("Lưu trữ sản phẩm này?")) event.preventDefault(); }}>
      <input type="hidden" name="sessionToken" value={sessionToken} />
      <input type="hidden" name="id" value={row.id} />
      <button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-50"><Trash2 className="size-4" />Lưu trữ</button>
    </form>
  );
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>;
}

function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) {
  resetPage();
  if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  else {
    setSortKey(nextKey);
    setSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }
}

function compareProducts(left: ProductRow, right: ProductRow, key: SortKey, direction: "asc" | "desc") {
  const modifier = direction === "asc" ? 1 : -1;
  if (key === "updatedAt") return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * modifier;
  if (key === "salePrice" || key === "quantity") return (left[key] - right[key]) * modifier;
  return String(left[key]).localeCompare(String(right[key]), "vi") * modifier;
}

function stockTone(row: ProductRow): Tone {
  const available = row.quantity - row.reservedQuantity;
  if (available <= 0) return "red";
  if (row.quantity <= row.minStock) return "amber";
  return "blue";
}

function statusTone(status: string): Tone {
  return ({ ACTIVE: "blue", DRAFT: "amber", HIDDEN: "slate", ARCHIVED: "red" } as Record<string, Tone>)[status] || "slate";
}

function inventoryHref(row: ProductRow) {
  return `/admin/inventory?search=${encodeURIComponent(row.sku)}`;
}

function purchaseHref(row: ProductRow) {
  const available = row.quantity - row.reservedQuantity;
  const suggestedQuantity = Math.max(row.minStock + 1 - available, 1);
  const params = new URLSearchParams({ productId: row.id, quantity: String(suggestedQuantity), note: "Tạo từ bảng sản phẩm" });
  return `/admin/purchases?${params.toString()}`;
}

function productExportHref(query: string, categoryId: string, status: string, stockFilter: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  if (categoryId) params.set("categoryId", categoryId);
  if (status) params.set("status", status);
  if (stockFilter) params.set("stock", stockFilter);
  const suffix = params.toString();
  return `/api/admin/products/export${suffix ? `?${suffix}` : ""}`;
}

function exportProductsCsv(rows: ProductRow[]) {
  const header = ["name", "sku", "category", "status", "costPrice", "salePrice", "promotionPrice", "quantity", "reservedQuantity", "available", "minStock", "updatedAt"];
  const body = rows.map((row) => [
    row.name,
    row.sku,
    row.categoryName || "",
    viStatus(row.status),
    row.costPrice,
    row.salePrice,
    row.promotionPrice ?? "",
    row.quantity,
    row.reservedQuantity,
    row.quantity - row.reservedQuantity,
    row.minStock,
    dateTimeText(row.updatedAt),
  ]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shoponline-products-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function viStatus(status: string) {
  return ({ ACTIVE: "Đang bán", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status;
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value));
}

function dateTimeText(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
