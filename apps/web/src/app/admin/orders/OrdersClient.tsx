"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Plus } from "lucide-react";
import { AdminPage, Button, DataPanel, EmptyState, Field, FilterBar, inputClass, ModalShell, PageHeader, Pagination, SearchField, SelectField, StatCard, StatusBadge, textareaClass, type Tone } from "@/components/admin/ui";

type OrderItemRow = { productName: string; sku: string | null; quantity: number; salePrice: number; total: number };
type OrderRow = { id: string; orderCode: string; customerName: string; total: number; paymentStatus: string; orderStatus: string; note: string | null; createdAt: string; items: OrderItemRow[] };
type CustomerOption = { id: string; name: string; phone: string | null };
type ProductOption = { id: string; name: string; sku: string; salePrice: number; available: number };
type ModalState = { mode: "create" } | { mode: "detail"; row: OrderRow } | null;
type SortKey = "createdAt" | "total" | "customerName" | "orderStatus";

const orderStatuses = ["NEW", "CONFIRMED", "PACKING", "SHIPPING", "COMPLETED", "CANCELLED", "RETURNED"];
const pageSize = 12;

export function OrdersClient({ rows, customers, products, sessionToken }: { rows: OrderRow[]; customers: CustomerOption[]; products: ProductOption[]; sessionToken: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const productsText = row.items.map((item) => item.productName).join(" ");
        const matchesTerm = !term || [row.orderCode, row.customerName, row.note || "", productsText].some((value) => value.toLowerCase().includes(term));
        return matchesTerm && (!status || row.orderStatus === status) && (!payment || row.paymentStatus === payment);
      })
      .sort((left, right) => compareOrders(left, right, sortKey, sortDirection));
  }, [payment, query, rows, sortDirection, sortKey, status]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openOrders = rows.filter((row) => !["COMPLETED", "CANCELLED", "RETURNED"].includes(row.orderStatus)).length;
  const completedOrders = rows.filter((row) => row.orderStatus === "COMPLETED");
  const completedRevenue = completedOrders.reduce((sum, row) => sum + row.total, 0);
  const unpaidOrders = rows.filter((row) => row.paymentStatus !== "PAID" && row.orderStatus !== "CANCELLED").length;

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin / Bán hàng / Đơn hàng" title="Quản lý đơn hàng" description="Tạo đơn, giữ tồn kho, theo dõi thanh toán và chuyển trạng thái đến khi hoàn tất xuất kho." action={<Button onClick={() => setModal({ mode: "create" })}><Plus className="mr-2 size-4" />Tạo đơn hàng</Button>} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng đơn" value={rows.length} hint="Tất cả trạng thái" />
        <StatCard label="Đang xử lý" value={openOrders} tone={openOrders ? "amber" : "emerald"} hint="Chưa hoàn tất hoặc hủy" />
        <StatCard label="Chưa thanh toán" value={unpaidOrders} tone={unpaidOrders ? "red" : "emerald"} hint="Cần kế toán theo dõi" />
        <StatCard label="Doanh thu hoàn tất" value={money(completedRevenue)} tone="emerald" hint={`${completedOrders.length} đơn hoàn tất`} />
      </section>

      <FilterBar resultText={`${filtered.length} / ${rows.length} đơn`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Mã đơn, khách hàng, sản phẩm, ghi chú" />
        <SelectField label="Trạng thái đơn" value={status} onChange={(value) => { setStatus(value); setPage(1); }}><option value="">Tất cả</option>{orderStatuses.map((item) => <option key={item} value={item}>{viOrderStatus(item)}</option>)}</SelectField>
        <SelectField label="Thanh toán" value={payment} onChange={(value) => { setPayment(value); setPage(1); }}><option value="">Tất cả</option><option value="UNPAID">Chưa thanh toán</option><option value="PARTIAL">Một phần</option><option value="PAID">Đã thanh toán</option><option value="REFUNDED">Đã hoàn tiền</option></SelectField>
      </FilterBar>

      <DataPanel>
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <SortableTh label="Mã đơn" active={sortKey === "createdAt"} direction={sortDirection} onClick={() => toggleSort("createdAt", sortKey, sortDirection, setSortKey, setSortDirection)} />
              <SortableTh label="Khách hàng" active={sortKey === "customerName"} direction={sortDirection} onClick={() => toggleSort("customerName", sortKey, sortDirection, setSortKey, setSortDirection)} />
              <th className="px-4 py-3 font-semibold">Sản phẩm</th>
              <SortableTh label="Tổng tiền" active={sortKey === "total"} direction={sortDirection} onClick={() => toggleSort("total", sortKey, sortDirection, setSortKey, setSortDirection)} />
              <th className="px-4 py-3 font-semibold">Thanh toán</th>
              <SortableTh label="Trạng thái" active={sortKey === "orderStatus"} direction={sortDirection} onClick={() => toggleSort("orderStatus", sortKey, sortDirection, setSortKey, setSortDirection)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                <td className="px-4 py-3"><strong>{row.orderCode}</strong><p className="mt-1 text-xs text-slate-500">{dateText(row.createdAt)}</p></td>
                <td className="px-4 py-3"><span className="font-semibold">{row.customerName}</span><p className="mt-1 max-w-56 truncate text-xs text-slate-500">{row.note || "Chưa có ghi chú"}</p></td>
                <td className="px-4 py-3"><div className="grid gap-1">{row.items.slice(0, 2).map((item) => <span key={`${row.id}-${item.productName}-${item.sku}`} className="text-slate-700">{item.productName} <span className="font-semibold">x{item.quantity}</span></span>)}{row.items.length > 2 ? <span className="text-xs text-slate-500">+{row.items.length - 2} sản phẩm khác</span> : null}</div></td>
                <td className="px-4 py-3 font-semibold">{money(row.total)}</td>
                <td className="px-4 py-3"><StatusBadge tone={paymentTone(row.paymentStatus)}>{viPayment(row.paymentStatus)}</StatusBadge></td>
                <td className="px-4 py-3"><StatusBadge tone={orderTone(row.orderStatus)}>{viOrderStatus(row.orderStatus)}</StatusBadge></td>
                <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={() => setModal({ mode: "detail", row })}><Eye className="size-4" />Xem</button><StatusButtons row={row} sessionToken={sessionToken} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="Không có đơn hàng phù hợp" description="Thử đổi bộ lọc, từ khóa tìm kiếm hoặc tạo đơn hàng mới cho khách." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      {modal?.mode === "detail" ? <OrderDetail row={modal.row} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "create" ? <OrderModal customers={customers} products={products} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function SortableTh({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  return <th className="px-4 py-3"><button className="inline-flex items-center gap-1 font-semibold" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}</button></th>;
}

function OrderModal({ customers, products, sessionToken, onClose }: { customers: CustomerOption[]; products: ProductOption[]; sessionToken: string; onClose: () => void }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [shippingFee, setShippingFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const product = products.find((item) => item.id === productId);
  const subtotal = (product?.salePrice || 0) * quantity;
  const total = Math.max(0, subtotal + shippingFee - discount);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/orders" method="post" className="grid max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">Tạo đơn hàng</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div>
        <div className="grid gap-4 overflow-y-auto p-5">
          {!products.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Chưa có sản phẩm còn hàng để tạo đơn.</div> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Khách hàng"><select className={inputClass} name="customerId"><option value="">Khách lẻ</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.phone ? ` - ${item.phone}` : ""}</option>)}</select></Field>
            <Field label="Sản phẩm"><select required className={inputClass} name="productId" value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} - còn {item.available}</option>)}</select></Field>
            <Field label="Số lượng"><input required className={inputClass} name="quantity" type="number" min={1} max={Math.max(1, product?.available || 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} /></Field>
            <Field label="Phí vận chuyển"><input className={inputClass} name="shippingFee" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(Math.max(0, Number(event.target.value || 0)))} /></Field>
            <Field label="Giảm giá"><input className={inputClass} name="discount" type="number" min={0} value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value || 0)))} /></Field>
            <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Tạm tính</span><strong className="mt-1 block text-xl">{money(total)}</strong></div>
            <Field label="Ghi chú" wide><textarea className={textareaClass} name="note" rows={3} /></Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huỷ</Button><Button type="submit" disabled={!products.length}>Tạo đơn</Button></div>
      </form>
    </div>
  );
}

function StatusButtons({ row, sessionToken }: { row: OrderRow; sessionToken: string }) {
  if (["CANCELLED", "RETURNED"].includes(row.orderStatus)) return null;
  const options = row.orderStatus === "COMPLETED" ? [["RETURNED", "Trả hàng", true]] : [
    ...(row.orderStatus === "NEW" ? [["CONFIRMED", "Xác nhận", false]] : []),
    ...(["NEW", "CONFIRMED", "PACKING", "SHIPPING"].includes(row.orderStatus) ? [["COMPLETED", "Hoàn tất", false]] : []),
    ...(["NEW", "CONFIRMED", "PACKING"].includes(row.orderStatus) ? [["CANCELLED", "Huỷ", true]] : []),
  ];
  return <>{options.map(([status, label, destructive]) => <form key={String(status)} action="/api/admin/orders/status" method="post" onSubmit={(event) => { if (destructive && !confirm("Xác nhận đổi trạng thái đơn hàng?")) event.preventDefault(); }}><input type="hidden" name="sessionToken" value={sessionToken} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value={String(status)} /><button className={`inline-flex min-h-9 items-center rounded-lg border px-3 py-2 font-semibold ${destructive ? "border-red-200 bg-white text-red-700 hover:bg-red-50" : "border-slate-300 bg-white hover:bg-slate-50"}`} type="submit">{label}</button></form>)}</>;
}

function OrderDetail({ row, onClose }: { row: OrderRow; onClose: () => void }) {
  return (
    <ModalShell title={row.orderCode} onClose={onClose} width="max-w-3xl">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2"><Info label="Khách hàng" value={row.customerName} /><Info label="Trạng thái" value={viOrderStatus(row.orderStatus)} /><Info label="Thanh toán" value={viPayment(row.paymentStatus)} /><Info label="Tổng tiền" value={money(row.total)} /><Info label="Ghi chú" value={row.note || "-"} wide /></div>
        <div className="overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-3 py-2">Sản phẩm</th><th className="px-3 py-2">SL</th><th className="px-3 py-2">Đơn giá</th><th className="px-3 py-2">Thành tiền</th></tr></thead><tbody>{row.items.map((item) => <tr key={`${item.productName}-${item.sku}`} className="border-t border-slate-100"><td className="px-3 py-2">{item.productName}<p className="text-xs text-slate-500">{item.sku || ""}</p></td><td className="px-3 py-2">{item.quantity}</td><td className="px-3 py-2">{money(item.salePrice)}</td><td className="px-3 py-2">{money(item.total)}</td></tr>)}</tbody></table></div>
      </div>
    </ModalShell>
  );
}

function Info({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) { return <div className={`rounded-lg bg-slate-50 p-3 ${wide ? "md:col-span-2" : ""}`}><span className="text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function toggleSort(nextKey: SortKey, sortKey: SortKey, sortDirection: "asc" | "desc", setSortKey: (key: SortKey) => void, setSortDirection: (direction: "asc" | "desc") => void) { if (nextKey === sortKey) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortKey(nextKey); setSortDirection(nextKey === "createdAt" ? "desc" : "asc"); } }
function compareOrders(left: OrderRow, right: OrderRow, key: SortKey, direction: "asc" | "desc") { const modifier = direction === "asc" ? 1 : -1; if (key === "createdAt") return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * modifier; if (key === "total") return (left.total - right.total) * modifier; return String(left[key]).localeCompare(String(right[key]), "vi") * modifier; }
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
function dateText(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function paymentTone(status: string): Tone { return ({ UNPAID: "amber", PARTIAL: "blue", PAID: "emerald", REFUNDED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function orderTone(status: string): Tone { return ({ NEW: "blue", CONFIRMED: "amber", PACKING: "amber", SHIPPING: "blue", COMPLETED: "emerald", CANCELLED: "red", RETURNED: "slate" } as Record<string, Tone>)[status] || "slate"; }
function viPayment(status: string) { return ({ UNPAID: "Chưa thanh toán", PARTIAL: "Thanh toán một phần", PAID: "Đã thanh toán", REFUNDED: "Đã hoàn tiền" } as Record<string, string>)[status] || status; }
function viOrderStatus(status: string) { return ({ NEW: "Mới", CONFIRMED: "Đã xác nhận", PACKING: "Đang đóng gói", SHIPPING: "Đang giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ", RETURNED: "Đã trả hàng" } as Record<string, string>)[status] || status; }
