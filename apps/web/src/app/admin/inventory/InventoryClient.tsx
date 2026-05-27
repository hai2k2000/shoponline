"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, PackagePlus, RotateCcw } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

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
type SortKey = "updatedAt" | "name" | "sku" | "quantity" | "reservedQuantity" | "available" | "value";

const pageSize = 12;

export function InventoryClient({ rows, transactions, sessionToken }: { rows: InventoryRow[]; transactions: TransactionRow[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const available = availableOf(row);
        const matchesTerm = !term || [row.name, row.sku, row.categoryName || ""].some((value) => value.toLowerCase().includes(term));
        const matchesStock = !stockFilter || (stockFilter === "LOW" ? row.quantity <= row.minStock : stockFilter === "OUT" ? available <= 0 : stockFilter === "RESERVED" ? row.reservedQuantity > 0 : available > 0);
        return matchesTerm && matchesStock;
      })
      .sort((left, right) => compareInventory(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalProducts = rows.length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalReserved = rows.reduce((sum, row) => sum + row.reservedQuantity, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const lowStock = rows.filter((row) => row.quantity <= row.minStock).length;
  const outAvailable = rows.filter((row) => availableOf(row) <= 0).length;

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Kho và hàng hóa / Kho hàng"
        title="Quản lý kho"
        description="Theo dõi tồn kho khả dụng, hàng đang giữ cho đơn, cảnh báo tồn thấp và lịch sử nhập xuất điều chỉnh."
        action={
          <>
            <Button onClick={() => setModal({ mode: "import" })}><PackagePlus className="mr-2 size-4" />Nhập kho</Button>
            <Button variant="outline" onClick={() => setModal({ mode: "export" })}><Minus className="mr-2 size-4" />Xuất kho</Button>
            <Button variant="outline" onClick={() => setModal({ mode: "adjust" })}><RotateCcw className="mr-2 size-4" />Điều chỉnh</Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sản phẩm trong kho" value={totalProducts} hint={`${totalQuantity} tổng tồn`} />
        <StatCard label="Đang giữ hàng" value={totalReserved} tone={totalReserved ? "blue" : "slate"} hint="Reserved cho đơn chưa hoàn tất" />
        <StatCard label="Tồn thấp" value={lowStock} tone={lowStock ? "amber" : "emerald"} hint={`${outAvailable} mã hết khả dụng`} />
        <StatCard label="Giá trị kho" value={money(totalValue)} tone="emerald" hint="Tính theo giá vốn" />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} mã hàng`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Tên, SKU, danh mục" />
        <SelectField label="Tình trạng tồn" value={stockFilter} onChange={(value) => { setStockFilter(value); resetPage(); }}>
          <option value="">Tất cả</option>
          <option value="AVAILABLE">Còn khả dụng</option>
          <option value="LOW">Tồn thấp</option>
          <option value="OUT">Hết khả dụng</option>
          <option value="RESERVED">Có hàng đang giữ</option>
        </SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}>
          <option value="updatedAt:desc">Mới cập nhật</option>
          <option value="quantity:asc">Tồn thấp trước</option>
          <option value="quantity:desc">Tồn cao trước</option>
          <option value="available:asc">Khả dụng thấp trước</option>
          <option value="value:desc">Giá trị cao trước</option>
          <option value="name:asc">Tên A-Z</option>
        </SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <SortableTh label="Sản phẩm" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Danh mục</th>
              <SortableTh label="Tồn" active={sortKey === "quantity"} direction={sortDirection} onClick={() => toggleSort("quantity", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Đang giữ" active={sortKey === "reservedQuantity"} direction={sortDirection} onClick={() => toggleSort("reservedQuantity", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Khả dụng" active={sortKey === "available"} direction={sortDirection} onClick={() => toggleSort("available", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Min</th>
              <SortableTh label="Giá trị" active={sortKey === "value"} direction={sortDirection} onClick={() => toggleSort("value", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const available = availableOf(row);
              return (
                <tr key={row.productId} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 font-mono text-xs text-slate-500">{row.sku}</p></td>
                  <td className="px-4 py-3">{row.categoryName || "-"}</td>
                  <td className="px-4 py-3 font-semibold">{row.quantity}</td>
                  <td className="px-4 py-3">{row.reservedQuantity}</td>
                  <td className="px-4 py-3"><StatusBadge tone={stockTone(row)}>{available}</StatusBadge></td>
                  <td className="px-4 py-3">{row.minStock}</td>
                  <td className="px-4 py-3">{money(row.quantity * row.costPrice)}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><RowButton label="Nhập" onClick={() => setModal({ mode: "import", row })} /><RowButton label="Xuất" onClick={() => setModal({ mode: "export", row })} /><RowButton label="Điều chỉnh" onClick={() => setModal({ mode: "adjust", row })} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có dữ liệu tồn kho phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc kiểm tra lại danh sách sản phẩm đang hoạt động." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">Giao dịch gần đây</h2><span className="text-sm font-semibold text-slate-500">{transactions.length} dòng mới nhất</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">SL</th><th className="px-4 py-3">Trước</th><th className="px-4 py-3">Sau</th><th className="px-4 py-3">Ghi chú</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{dateText(item.createdAt)}</td><td className="px-4 py-3"><strong>{item.productName}</strong><p className="font-mono text-xs text-slate-500">{item.sku}</p></td><td className="px-4 py-3"><StatusBadge tone={transactionTone(item.type)}>{viType(item.type)}</StatusBadge></td><td className="px-4 py-3 font-semibold">{item.quantity}</td><td className="px-4 py-3">{item.beforeQuantity}</td><td className="px-4 py-3">{item.afterQuantity}</td><td className="px-4 py-3">{item.note || "-"}</td></tr>)}</tbody></table></div>
      </section>

      {modal ? <InventoryModal modal={modal} products={rows} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function InventoryModal({ modal, products, sessionToken, onClose }: { modal: NonNullable<ModalState>; products: InventoryRow[]; sessionToken: string; onClose: () => void }) {
  const title = modal.mode === "import" ? "Nhập kho" : modal.mode === "export" ? "Xuất kho" : "Điều chỉnh tồn";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/inventory" method="post" className="grid w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={modal.mode} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{title}</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="grid gap-4 p-5">
          {modal.row ? <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Mã hàng đang chọn</span><strong className="mt-1 block">{modal.row.sku} - {modal.row.name}</strong><p className="mt-1 text-xs text-slate-500">Tồn {modal.row.quantity} · Giữ {modal.row.reservedQuantity} · Khả dụng {availableOf(modal.row)}</p></div> : null}
          <Field label="Sản phẩm"><select className={inputClass} name="productId" defaultValue={modal.row?.productId || ""} required><option value="">Chọn sản phẩm</option>{products.map((item) => <option key={item.productId} value={item.productId}>{item.sku} - {item.name}</option>)}</select></Field>
          {modal.mode === "adjust" ? <Field label="Tồn thực tế"><input className={inputClass} name="actualQuantity" type="number" min="0" defaultValue={modal.row?.quantity || 0} required /></Field> : <Field label="Số lượng"><input className={inputClass} name="quantity" type="number" min="1" defaultValue={1} required /></Field>}
          <Field label="Ghi chú"><textarea className={textareaClass} name="note" rows={3} placeholder={modal.mode === "export" ? "Lý do xuất kho" : "Ghi chú"} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit">Lưu</Button></div>
      </form>
    </div>
  );
}

function RowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={onClick}>{label}</button>;
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

function compareInventory(left: InventoryRow, right: InventoryRow, key: SortKey, direction: "asc" | "desc") {
  const modifier = direction === "asc" ? 1 : -1;
  if (key === "updatedAt") return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * modifier;
  if (key === "available") return (availableOf(left) - availableOf(right)) * modifier;
  if (key === "value") return (left.quantity * left.costPrice - right.quantity * right.costPrice) * modifier;
  if (key === "quantity" || key === "reservedQuantity") return (left[key] - right[key]) * modifier;
  return String(left[key]).localeCompare(String(right[key]), "vi") * modifier;
}

function availableOf(row: InventoryRow) {
  return row.quantity - row.reservedQuantity;
}

function stockTone(row: InventoryRow): Tone {
  const available = availableOf(row);
  if (available <= 0) return "red";
  if (row.quantity <= row.minStock) return "amber";
  return "emerald";
}

function transactionTone(type: string): Tone {
  return ({ IMPORT: "emerald", EXPORT: "red", ADJUST: "blue", RETURN: "amber" } as Record<string, Tone>)[type] || "slate";
}

function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function viType(type: string) { return ({ IMPORT: "Nhập", EXPORT: "Xuất", ADJUST: "Điều chỉnh", RETURN: "Hoàn" } as Record<string, string>)[type] || type; }
