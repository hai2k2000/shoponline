"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type SupplierOption = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string; costPrice: number };
type PurchaseItem = { productId: string; productName: string; sku: string | null; quantity: number; costPrice: number; total: number };
type PurchaseRow = { id: string; code: string; supplierId: string | null; supplier: string; status: string; total: number; expectedAt: string | null; receivedAt: string | null; note: string | null; items: PurchaseItem[] };
type ModalState = { mode: "create" } | { mode: "detail"; row: PurchaseRow } | null;
type InitialPurchase = { productId?: string; quantity?: number; note?: string };
type SortKey = "code" | "supplier" | "total" | "expectedAt" | "receivedAt" | "status";

const statuses = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"];
const pageSize = 12;

export function PurchasesClient({
  rows,
  suppliers,
  products,
  sessionToken,
  initialProductId = "",
  initialQuery = "",
  initialQuantity = 1,
  initialNote = "",
  initialOpen = false,
}: {
  rows: PurchaseRow[];
  suppliers: SupplierOption[];
  products: ProductOption[];
  sessionToken: string;
  initialProductId?: string;
  initialQuery?: string;
  initialQuantity?: number;
  initialNote?: string;
  initialOpen?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("expectedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(initialOpen ? { mode: "create" } : null);
  const initialPurchase = useMemo<InitialPurchase>(() => ({ productId: initialProductId, quantity: initialQuantity, note: initialNote }), [initialNote, initialProductId, initialQuantity]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const values = [row.code, row.supplier, row.note || "", ...row.items.map((item) => item.productName), ...row.items.map((item) => item.sku || "")];
        const matchesTerm = !term || values.some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.status === status);
      })
      .sort((left, right) => comparePurchases(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const orderedCount = rows.filter((row) => row.status === "ORDERED").length;
  const receivedRows = rows.filter((row) => row.status === "RECEIVED");
  const cancelledCount = rows.filter((row) => row.status === "CANCELLED").length;
  const receivedTotal = receivedRows.reduce((sum, row) => sum + row.total, 0);

  function resetPage() {
    setPage(1);
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Kho hàng / Nhập hàng"
        title="Đơn nhập hàng"
        description="Lập phiếu nhập từ nhà cung cấp, theo dõi lịch nhận và cập nhật tồn kho khi hàng về."
        action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo đơn nhập</Button>}
      />

      {initialOpen ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Đang tạo đơn nhập từ cảnh báo tồn thấp. Kiểm tra nhà cung cấp, ngày dự kiến và giá nhập trước khi lưu.
        </div>
      ) : null}

      {initialQuery ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Dang mo don nhap theo tu khoa <span className="font-mono">{initialQuery}</span>.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng đơn nhập" value={rows.length} hint={`${filtered.length} đang hiển thị`} />
        <StatCard label="Đã đặt" value={orderedCount} tone={orderedCount ? "amber" : "slate"} hint="Chờ nhận hàng" />
        <StatCard label="Đã nhận" value={receivedRows.length} tone="emerald" hint="Đã cập nhật tồn kho" />
        <StatCard label="Giá trị đã nhận" value={money(receivedTotal)} tone={receivedTotal ? "blue" : "slate"} hint={`${cancelledCount} đơn đã hủy`} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} đơn`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="Mã nhập, nhà cung cấp, sản phẩm, SKU" />
        <SelectField label="Trạng thái" value={status} onChange={(value) => { setStatus(value); resetPage(); }}>
          <option value="">Tất cả</option>
          {statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}
        </SelectField>
        <SelectField label="Sắp xếp" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}>
          <option value="expectedAt:desc">Dự kiến mới trước</option>
          <option value="expectedAt:asc">Dự kiến cũ trước</option>
          <option value="total:desc">Giá trị cao trước</option>
          <option value="supplier:asc">Nhà cung cấp A-Z</option>
          <option value="status:asc">Trạng thái A-Z</option>
        </SelectField>
      </FilterBar>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <strong className="text-sm">{filtered.length} don nhap dang loc</strong>
        <a className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={purchaseExportHref(query, status)}>Tai CSV</a>
      </div>

      <DataPanel>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <SortableTh label="Mã nhập" active={sortKey === "code"} direction={sortDirection} onClick={() => toggleSort("code", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Nhà cung cấp" active={sortKey === "supplier"} direction={sortDirection} onClick={() => toggleSort("supplier", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Sản phẩm</th>
              <SortableTh label="Tổng tiền" active={sortKey === "total"} direction={sortDirection} onClick={() => toggleSort("total", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Dự kiến" active={sortKey === "expectedAt"} direction={sortDirection} onClick={() => toggleSort("expectedAt", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Trạng thái" active={sortKey === "status"} direction={sortDirection} onClick={() => toggleSort("status", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <strong>{row.code}</strong>
                  <p className="mt-1 max-w-60 truncate text-xs text-slate-500">{row.note || "Không có ghi chú"}</p>
                </td>
                <td className="px-4 py-3">
                  <strong>{row.supplier}</strong>
                  {row.supplierId ? <p className="mt-1"><a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/suppliers?search=${encodeURIComponent(row.supplier)}`}>Mở nhà cung cấp</a></p> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-1">
                    {row.items.slice(0, 2).map((item) => <span key={`${row.id}-${item.productName}-${item.quantity}`}>{item.productName} x{item.quantity}</span>)}
                    {row.items.length > 2 ? <span className="text-xs text-slate-500">+{row.items.length - 2} sản phẩm khác</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{money(row.total)}</td>
                <td className="px-4 py-3">{row.expectedAt ? dateText(row.expectedAt) : "-"}</td>
                <td className="px-4 py-3"><StatusBadge tone={statusTone(row.status)}>{viStatus(row.status)}</StatusBadge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => setModal({ mode: "detail", row })}>Xem</Button>
                    <PurchaseActions row={row} sessionToken={sessionToken} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Chưa có đơn nhập phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo đơn nhập mới từ nút Tạo đơn nhập." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "create" ? <PurchaseModal suppliers={suppliers} products={products} sessionToken={sessionToken} initial={initialPurchase} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "detail" ? <PurchaseDetail row={modal.row} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function PurchaseModal({ suppliers, products, sessionToken, initial, onClose }: { suppliers: SupplierOption[]; products: ProductOption[]; sessionToken: string; initial: InitialPurchase; onClose: () => void }) {
  const initialProductId = products.some((item) => item.id === initial.productId) ? initial.productId || "" : products[0]?.id || "";
  const [productId, setProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState(Math.max(1, initial.quantity || 1));
  const [shippingFee, setShippingFee] = useState(0);
  const product = products.find((item) => item.id === productId);
  const subtotal = (product?.costPrice || 0) * quantity;
  const total = subtotal + shippingFee;

  return (
    <ModalShell
      title="Tạo đơn nhập"
      onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Hủy</Button><button className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-55" type="submit" form="purchase-form" disabled={!products.length}>Lưu đơn nhập</button></>}
    >
      <form id="purchase-form" action="/api/admin/purchases" method="post" className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        {!products.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 md:col-span-2">Cần có sản phẩm trước khi tạo đơn nhập.</div> : null}
        <Field label="Nhà cung cấp"><select className={inputClass} name="supplierId"><option value="">Chưa chọn</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Sản phẩm"><select required className={inputClass} name="productId" value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.sku}</option>)}</select></Field>
        <Field label="Số lượng"><input required className={inputClass} name="quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} /></Field>
        <Field label="Giá nhập"><input className={inputClass} name="costPrice" type="number" min={0} defaultValue={product?.costPrice || 0} /></Field>
        <Field label="Phí vận chuyển"><input className={inputClass} name="shippingFee" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(Math.max(0, Number(event.target.value || 0)))} /></Field>
        <Field label="Ngày dự kiến"><input className={inputClass} name="expectedAt" type="date" /></Field>
        <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Tạm tính</span><strong className="mt-1 block text-xl text-slate-950">{money(total)}</strong></div>
        <Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} defaultValue={initial.note || ""} /></Field>
      </form>
    </ModalShell>
  );
}

function PurchaseDetail({ row, sessionToken, onClose }: { row: PurchaseRow; sessionToken: string; onClose: () => void }) {
  return (
    <ModalShell title={`Đơn nhập ${row.code}`} onClose={onClose} width="max-w-4xl">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Nhà cung cấp" value={row.supplier || "-"} />
          <Info label="Trạng thái" value={viStatus(row.status)} />
          <Info label="Tổng tiền" value={money(row.total)} />
          <Info label="Dự kiến nhận" value={row.expectedAt ? dateText(row.expectedAt) : "-"} />
          <Info label="Ngày nhận" value={row.receivedAt ? dateText(row.receivedAt) : "-"} />
          <Info label="Ghi chú" value={row.note || "-"} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm text-slate-700">
            <strong className="block text-slate-950">{row.status === "ORDERED" ? "Sẵn sàng nhận hàng" : viStatus(row.status)}</strong>
            <span>{row.status === "ORDERED" ? "Nhận hàng sẽ cộng tồn kho và ghi giao dịch kho cho các SKU trong đơn này." : "Đơn này không còn thao tác nhận hàng trực tiếp."}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {row.supplierId ? <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={`/admin/suppliers?search=${encodeURIComponent(row.supplier)}`}>Mở nhà cung cấp</a> : null}
            <PurchaseActions row={row} sessionToken={sessionToken} />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 text-right font-semibold">Số lượng</th>
                <th className="px-4 py-3 text-right font-semibold">Giá nhập</th>
                <th className="px-4 py-3 text-right font-semibold">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {row.items.map((item) => {
                const lookup = item.sku || item.productName;
                return (
                  <tr key={`${row.id}-${item.productId}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <strong>{item.productName}</strong>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/products?search=${encodeURIComponent(lookup)}`}>Mở sản phẩm</a>
                        <a className="text-xs font-semibold text-emerald-700 hover:underline" href={`/admin/inventory?search=${encodeURIComponent(lookup)}`}>Mở tồn kho</a>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sku || "-"}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{money(item.costPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(item.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}

function PurchaseActions({ row, sessionToken }: { row: PurchaseRow; sessionToken: string }) {
  if (["RECEIVED", "CANCELLED"].includes(row.status)) return <span className="block text-right text-sm text-slate-400">-</span>;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <form action="/api/admin/purchases/status" method="post" onSubmit={(event) => { if (!confirm("Nhận hàng và cộng tồn kho cho đơn nhập này?")) event.preventDefault(); }}>
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="status" value="RECEIVED" />
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" type="submit">Nhận hàng</button>
      </form>
      <form action="/api/admin/purchases/status" method="post" onSubmit={(event) => { if (!confirm("Hủy đơn nhập này?")) event.preventDefault(); }}>
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="status" value="CANCELLED" />
        <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50" type="submit">Hủy</button>
      </form>
    </div>
  );
}

function purchaseExportHref(query: string, status: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  if (status) params.set("status", status);
  const suffix = params.toString();
  return `/api/admin/purchases/export${suffix ? `?${suffix}` : ""}`;
}

function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>;
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>;
}

function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void, resetPage: () => void) {
  resetPage();
  if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  else {
    setSortKey(nextKey);
    setSortDirection(["total", "expectedAt", "receivedAt"].includes(nextKey) ? "desc" : "asc");
  }
}

function comparePurchases(left: PurchaseRow, right: PurchaseRow, key: SortKey, direction: "asc" | "desc") {
  const modifier = direction === "asc" ? 1 : -1;
  if (key === "total") return (left.total - right.total) * modifier;
  if (key === "expectedAt" || key === "receivedAt") return ((left[key] ? new Date(left[key]).getTime() : 0) - (right[key] ? new Date(right[key]).getTime() : 0)) * modifier;
  return String(left[key] || "").localeCompare(String(right[key] || ""), "vi") * modifier;
}

function statusTone(status: string): Tone {
  return ({ DRAFT: "slate", ORDERED: "amber", RECEIVED: "emerald", CANCELLED: "red" } as Record<string, Tone>)[status] || "slate";
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value));
}

function viStatus(status: string) {
  return ({ DRAFT: "Nháp", ORDERED: "Đã đặt", RECEIVED: "Đã nhận", CANCELLED: "Đã hủy" } as Record<string, string>)[status] || status;
}
