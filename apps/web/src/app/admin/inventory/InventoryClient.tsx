"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, Eye, Minus, PackagePlus, RotateCcw } from "lucide-react";
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
  lastTransactionAt: string | null;
};

type TransactionRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  note: string | null;
  createdAt: string;
};

type ModalState = { mode: "detail"; row: InventoryRow } | { mode: "transaction"; transaction: TransactionRow } | { mode: "import" | "export" | "adjust"; row?: InventoryRow; suggestedQuantity?: number; suggestedNote?: string } | null;
type SortKey = "updatedAt" | "name" | "sku" | "quantity" | "reservedQuantity" | "available" | "value";

const pageSize = 12;

export function InventoryClient({ rows, transactions, sessionToken, initialQuery = "" }: { rows: InventoryRow[]; transactions: TransactionRow[]; sessionToken: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
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
        const matchesTerm = !term || [row.name, row.sku, row.categoryName || ""].some((value) => value.toLowerCase().includes(term));
        const matchesStock = !stockFilter || matchesStockFilter(row, stockFilter);
        return matchesTerm && matchesStock;
      })
      .sort((left, right) => compareInventory(left, right, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedRows = filtered.filter((row) => selectedIds.has(row.productId));
  const selectedVisibleCount = visibleRows.filter((row) => selectedIds.has(row.productId)).length;
  const allVisibleSelected = Boolean(visibleRows.length) && selectedVisibleCount === visibleRows.length;
  const totalProducts = rows.length;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalReserved = rows.reduce((sum, row) => sum + row.reservedQuantity, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const lowStockRows = useMemo(() => rows.filter((row) => availableOf(row) <= row.minStock).sort((left, right) => availableOf(left) - availableOf(right)), [rows]);
  const lowStock = lowStockRows.length;
  const outAvailable = rows.filter((row) => availableOf(row) <= 0).length;
  const negativeAvailableRows = useMemo(() => rows.filter((row) => availableOf(row) < 0).sort((left, right) => availableOf(left) - availableOf(right)), [rows]);
  const noTransactionRows = useMemo(() => rows.filter((row) => !row.lastTransactionAt), [rows]);
  const staleRows = useMemo(() => rows.filter((row) => isStaleInventory(row)), [rows]);
  const blockedValue = rows.reduce((sum, row) => sum + row.reservedQuantity * row.costPrice, 0);

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
      if (allVisibleSelected) visibleRows.forEach((row) => next.delete(row.productId));
      else visibleRows.forEach((row) => next.add(row.productId));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin / Kho vÃ  hÃ ng hÃ³a / Kho hÃ ng"
        title="Quáº£n lÃ½ kho"
        description="Theo dÃµi tá»“n kho kháº£ dá»¥ng, hÃ ng Ä‘ang giá»¯ cho Ä‘Æ¡n, cáº£nh bÃ¡o tá»“n tháº¥p vÃ  lá»‹ch sá»­ nháº­p xuáº¥t Ä‘iá»u chá»‰nh."
        action={
          <>
            <Button onClick={() => setModal({ mode: "import" })}><PackagePlus className="mr-2 size-4" />Nháº­p kho</Button>
            <Button variant="outline" onClick={() => setModal({ mode: "export" })}><Minus className="mr-2 size-4" />Xuáº¥t kho</Button>
            <Button variant="outline" onClick={() => setModal({ mode: "adjust" })}><RotateCcw className="mr-2 size-4" />Äiá»u chá»‰nh</Button>
          </>
        }
      />

      {initialQuery ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Äang má»Ÿ tá»“n kho theo tá»« khÃ³a <span className="font-mono">{initialQuery}</span>.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sáº£n pháº©m trong kho" value={totalProducts} hint={`${totalQuantity} tá»•ng tá»“n`} />
        <StatCard label="Äang giá»¯ hÃ ng" value={totalReserved} tone={totalReserved ? "blue" : "slate"} hint="Reserved cho Ä‘Æ¡n chÆ°a hoÃ n táº¥t" />
        <StatCard label="Tá»“n tháº¥p" value={lowStock} tone={lowStock ? "amber" : "emerald"} hint={`${outAvailable} mÃ£ háº¿t kháº£ dá»¥ng`} />
        <StatCard label="GiÃ¡ trá»‹ kho" value={money(totalValue)} tone="emerald" hint="TÃ­nh theo giÃ¡ vá»‘n" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Canh bao am kha dung" value={negativeAvailableRows.length} tone={negativeAvailableRows.length ? "red" : "emerald"} hint="Reserved vuot ton thuc te" />
        <StatCard label="Gia tri dang giu" value={money(blockedValue)} tone={blockedValue ? "blue" : "slate"} hint="Gia von cua hang dang reserved" />
        <StatCard label="Hang cham luan chuyen" value={staleRows.length} tone={staleRows.length ? "amber" : "emerald"} hint="Khong co giao dich kho trong 30 ngay" />
        <StatCard label="Chua co lich su kho" value={noTransactionRows.length} tone={noTransactionRows.length ? "amber" : "emerald"} hint="SKU chua co inventory transaction" />
      </section>

      <section className="overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3">
            <div>
              <h2 className="font-semibold text-red-900">Inventory risk dashboard</h2>
              <p className="mt-1 text-sm text-red-800">Tap trung xu ly am kha dung, hang cham luan chuyen va SKU chua co lich su kho.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setStockFilter("NEGATIVE"); setSortKey("available"); setSortDirection("asc"); resetPage(); }}>Loc am kha dung</Button>
              <Button variant="outline" onClick={() => { setStockFilter("STALE"); setSortKey("updatedAt"); setSortDirection("asc"); resetPage(); }}>Loc cham luan chuyen</Button>
              <Button variant="outline" onClick={() => { setStockFilter("NO_TRANSACTION"); resetPage(); }}>Loc chua co lich su</Button>
            </div>
          </div>
          <div className="grid gap-0 md:grid-cols-3">
            <RiskList title="Am kha dung" rows={negativeAvailableRows.slice(0, 6)} emptyText="Khong co SKU am kha dung." />
            <RiskList title="Cham luan chuyen" rows={staleRows.slice(0, 6)} emptyText="Khong co SKU cham luan chuyen." />
            <RiskList title="Chua co lich su" rows={noTransactionRows.slice(0, 6)} emptyText="Tat ca SKU da co lich su kho." />
          </div>
      </section>

      {lowStockRows.length ? (
        <section className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
            <div>
              <h2 className="font-semibold text-amber-900">Cáº§n xá»­ lÃ½ tá»“n tháº¥p</h2>
              <p className="mt-1 text-sm text-amber-800">Æ¯u tiÃªn cÃ¡c SKU háº¿t kháº£ dá»¥ng hoáº·c tháº¥p hÆ¡n ngÆ°á»¡ng tá»“n tá»‘i thiá»ƒu.</p>
            </div>
            <Button variant="outline" onClick={() => { setStockFilter("LOW"); setSortKey("available"); setSortDirection("asc"); resetPage(); }}>Lá»c tá»“n tháº¥p</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Sáº£n pháº©m</th><th className="px-4 py-3">Kháº£ dá»¥ng</th><th className="px-4 py-3">Min</th><th className="px-4 py-3">Äá» xuáº¥t nháº­p</th><th className="px-4 py-3 text-right">Thao tÃ¡c</th></tr></thead>
              <tbody>{lowStockRows.slice(0, 8).map((row) => {
                const available = availableOf(row);
                const suggestedQuantity = suggestedImportQuantity(row);
                return (
                  <tr key={row.productId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                    <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 text-xs text-slate-500">{row.categoryName || "ChÆ°a phÃ¢n loáº¡i"}</p></td>
                    <td className="px-4 py-3"><StatusBadge tone={available <= 0 ? "red" : "amber"}>{available}</StatusBadge></td>
                    <td className="px-4 py-3">{row.minStock}</td>
                    <td className="px-4 py-3 font-semibold">{suggestedQuantity}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2"><a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50" href={purchaseHref(row, suggestedQuantity)}><PackagePlus className="size-4" />Táº¡o Ä‘Æ¡n nháº­p</a><RowButton label="Nháº­p Ä‘á» xuáº¥t" icon={<PackagePlus className="size-4" />} onClick={() => setModal({ mode: "import", row, suggestedQuantity, suggestedNote: "Nháº­p bá»• sung tá»“n tháº¥p" })} /><RowButton label="Xem" icon={<Eye className="size-4" />} onClick={() => setModal({ mode: "detail", row })} /></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      <FilterBar resultText={`${filtered.length} / ${rows.length} mÃ£ hÃ ng`}>
        <SearchField value={query} onChange={(value) => { setQuery(value); resetPage(); }} placeholder="TÃªn, SKU, danh má»¥c" />
        <SelectField label="TÃ¬nh tráº¡ng tá»“n" value={stockFilter} onChange={(value) => { setStockFilter(value); resetPage(); }}>
          <option value="">Táº¥t cáº£</option>
          <option value="AVAILABLE">CÃ²n kháº£ dá»¥ng</option>
          <option value="LOW">Tá»“n tháº¥p</option>
          <option value="OUT">Háº¿t kháº£ dá»¥ng</option>
          <option value="RESERVED">CÃ³ hÃ ng Ä‘ang giá»¯</option>
          <option value="NEGATIVE">Am kha dung</option>
          <option value="STALE">Hang cham luan chuyen</option>
          <option value="NO_TRANSACTION">Chua co lich su kho</option>
        </SelectField>
        <SelectField label="Sáº¯p xáº¿p" value={`${sortKey}:${sortDirection}`} onChange={(value) => { const [key, direction] = value.split(":") as [SortKey, "asc" | "desc"]; setSortKey(key); setSortDirection(direction); resetPage(); }}>
          <option value="updatedAt:desc">Má»›i cáº­p nháº­t</option>
          <option value="quantity:asc">Tá»“n tháº¥p trÆ°á»›c</option>
          <option value="quantity:desc">Tá»“n cao trÆ°á»›c</option>
          <option value="available:asc">Kháº£ dá»¥ng tháº¥p trÆ°á»›c</option>
          <option value="value:desc">GiÃ¡ trá»‹ cao trÆ°á»›c</option>
          <option value="name:asc">TÃªn A-Z</option>
        </SelectField>
      </FilterBar>

      <InventoryBulkBar
        filteredRows={filtered}
        query={query}
        selectedRows={selectedRows}
        stockFilter={stockFilter}
        onClear={clearSelection}
        onImportFirst={(row) => setModal({ mode: "import", row, suggestedQuantity: suggestedImportQuantity(row), suggestedNote: "Nháº­p nhanh tá»« báº£ng tá»“n kho" })}
      />

      <DataPanel>
        <table className="w-full min-w-[1140px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  aria-label="Chọn tất cả mã hàng trên trang"
                  checked={allVisibleSelected}
                  className="size-4 rounded border-slate-300"
                  onChange={toggleVisibleRows}
                  type="checkbox"
                />
              </th>
              <SortableTh label="Sáº£n pháº©m" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Danh má»¥c</th>
              <SortableTh label="Tá»“n" active={sortKey === "quantity"} direction={sortDirection} onClick={() => toggleSort("quantity", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Äang giá»¯" active={sortKey === "reservedQuantity"} direction={sortDirection} onClick={() => toggleSort("reservedQuantity", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <SortableTh label="Kháº£ dá»¥ng" active={sortKey === "available"} direction={sortDirection} onClick={() => toggleSort("available", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 font-semibold">Min</th>
              <SortableTh label="GiÃ¡ trá»‹" active={sortKey === "value"} direction={sortDirection} onClick={() => toggleSort("value", sortKey, sortDirection, setSortKey, setSortDirection, resetPage)} />
              <th className="px-4 py-3 text-right font-semibold">Thao tÃ¡c</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const available = availableOf(row);
              return (
                <tr key={row.productId} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Chọn mã hàng ${row.sku}`}
                      checked={selectedIds.has(row.productId)}
                      className="size-4 rounded border-slate-300"
                      onChange={() => toggleRow(row.productId)}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 font-mono text-xs text-slate-500">{row.sku}</p></td>
                  <td className="px-4 py-3">{row.categoryName || "-"}</td>
                  <td className="px-4 py-3 font-semibold">{row.quantity}</td>
                  <td className="px-4 py-3">{row.reservedQuantity}</td>
                  <td className="px-4 py-3"><StatusBadge tone={stockTone(row)}>{available}</StatusBadge></td>
                  <td className="px-4 py-3">{row.minStock}</td>
                  <td className="px-4 py-3">{money(row.quantity * row.costPrice)}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2"><RowButton label="Xem" icon={<Eye className="size-4" />} onClick={() => setModal({ mode: "detail", row })} /><RowButton label="Nháº­p" onClick={() => setModal({ mode: "import", row })} /><RowButton label="Xuáº¥t" onClick={() => setModal({ mode: "export", row })} /><RowButton label="Äiá»u chá»‰nh" onClick={() => setModal({ mode: "adjust", row })} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visibleRows.length ? <EmptyState title="KhÃ´ng cÃ³ dá»¯ liá»‡u tá»“n kho phÃ¹ há»£p" description="Thá»­ Ä‘á»•i bá»™ lá»c, tá»« khÃ³a tÃ¬m kiáº¿m hoáº·c kiá»ƒm tra láº¡i danh sÃ¡ch sáº£n pháº©m Ä‘ang hoáº¡t Ä‘á»™ng." /> : null}
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </DataPanel>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="font-semibold">Giao dá»‹ch gáº§n Ä‘Ã¢y</h2><span className="text-sm font-semibold text-slate-500">{transactions.length} dÃ²ng má»›i nháº¥t</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Thá»i gian</th><th className="px-4 py-3">Sáº£n pháº©m</th><th className="px-4 py-3">Loáº¡i</th><th className="px-4 py-3">SL</th><th className="px-4 py-3">TrÆ°á»›c</th><th className="px-4 py-3">Sau</th><th className="px-4 py-3">Ghi chÃº</th><th className="px-4 py-3 text-right">Thao tÃ¡c</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{dateText(item.createdAt)}</td><td className="px-4 py-3"><strong>{item.productName}</strong><p className="font-mono text-xs text-slate-500">{item.sku}</p></td><td className="px-4 py-3"><StatusBadge tone={transactionTone(item.type)}>{viType(item.type)}</StatusBadge></td><td className="px-4 py-3 font-semibold">{item.quantity}</td><td className="px-4 py-3">{item.beforeQuantity}</td><td className="px-4 py-3">{item.afterQuantity}</td><td className="px-4 py-3">{item.note || "-"}</td><td className="px-4 py-3 text-right"><button type="button" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={() => setModal({ mode: "transaction", transaction: item })}>Xem</button></td></tr>)}</tbody></table></div>
      </section>

      {modal?.mode === "detail" ? <InventoryDetail row={modal.row} transactions={transactions} onClose={() => setModal(null)} /> : null}
      {modal?.mode === "transaction" ? <TransactionDetail transaction={modal.transaction} onClose={() => setModal(null)} /> : null}
      {modal && modal.mode !== "detail" && modal.mode !== "transaction" ? <InventoryModal modal={modal} products={rows} sessionToken={sessionToken} onClose={() => setModal(null)} /> : null}
    </AdminPage>
  );
}

function InventoryBulkBar({ filteredRows, query, selectedRows, stockFilter, onClear, onImportFirst }: { filteredRows: InventoryRow[]; query: string; selectedRows: InventoryRow[]; stockFilter: string; onClear: () => void; onImportFirst: (row: InventoryRow) => void }) {
  const activeRows = selectedRows.length ? selectedRows : filteredRows;
  const firstRow = activeRows[0];
  const totalQuantity = activeRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalReserved = activeRows.reduce((sum, row) => sum + row.reservedQuantity, 0);
  const totalAvailable = activeRows.reduce((sum, row) => sum + availableOf(row), 0);
  const totalValue = activeRows.reduce((sum, row) => sum + row.quantity * row.costPrice, 0);
  const lowStock = activeRows.filter((row) => availableOf(row) <= row.minStock).length;
  const label = selectedRows.length ? `${selectedRows.length} mã hàng đã chọn` : `${filteredRows.length} mã hàng đang lọc`;
  const exportHref = inventoryExportHref(query, stockFilter);

  if (!filteredRows.length) return null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-1">
        <strong className="text-sm">{label}</strong>
        <p className="text-xs font-semibold text-slate-500">
          Tổng {totalQuantity} · Giữ {totalReserved} · Khả dụng {totalAvailable} · Tồn thấp {lowStock} · Giá trị {money(totalValue)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {firstRow ? (
          <>
            <a className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={`/admin/products?search=${encodeURIComponent(firstRow.sku)}`}>Mở sản phẩm mã đầu</a>
            <a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" href={purchaseHref(firstRow, suggestedImportQuantity(firstRow))}><PackagePlus className="size-4" />Tạo đơn nhập</a>
            <button className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => onImportFirst(firstRow)} type="button">Nhập nhanh</button>
          </>
        ) : null}
        <button className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => exportInventoryCsv(activeRows)} type="button"><Download className="size-4" />Xuất CSV</button>
        <a className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={exportHref}><Download className="size-4" />Tải CSV</a>
        {selectedRows.length ? <button className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={onClear} type="button">Bỏ chọn</button> : null}
      </div>
    </section>
  );
}

function RiskList({ title, rows, emptyText }: { title: string; rows: InventoryRow[]; emptyText: string }) {
  return (
    <article className="border-t border-red-100 p-4 md:border-r">
      <h3 className="font-semibold">{title}</h3>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => {
            const available = availableOf(row);
            return (
              <a key={row.productId} className="rounded-lg border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50" href={`/admin/inventory?search=${encodeURIComponent(row.sku)}`}>
                <strong className="block">{row.name}</strong>
                <span className="mt-1 block font-mono text-xs text-slate-500">{row.sku}</span>
                <span className="mt-2 block text-xs font-semibold text-slate-600">Ton {row.quantity} · Giu {row.reservedQuantity} · Kha dung {available} · GD cuoi {row.lastTransactionAt ? dateText(row.lastTransactionAt) : "chua co"}</span>
              </a>
            );
          })}
        </div>
      ) : <p className="mt-3 text-sm text-slate-500">{emptyText}</p>}
    </article>
  );
}

function InventoryDetail({ row, transactions, onClose }: { row: InventoryRow; transactions: TransactionRow[]; onClose: () => void }) {
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const available = availableOf(row);
  const relatedTransactions = transactions.filter((item) => item.sku === row.sku).slice(0, 8);
  const productHref = `/admin/products?search=${encodeURIComponent(row.sku)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section className="grid max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{row.name}</h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{row.sku}</p>
          </div>
          <Button variant="outline" onClick={onClose}>ÄÃ³ng</Button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={productHref}>Má»Ÿ sáº£n pháº©m</a>
          </div>
          <section className="grid gap-3 md:grid-cols-4">
            <Info label="Danh má»¥c" value={row.categoryName || "-"} />
            <Info label="Tráº¡ng thÃ¡i" value={viStatus(row.status)} />
            <Info label="Cáº­p nháº­t" value={dateText(row.updatedAt)} />
            <Info label="Tá»“n tá»‘i thiá»ƒu" value={row.minStock} />
            <Info label="Tá»“n tá»•ng" value={row.quantity} />
            <Info label="Äang giá»¯" value={row.reservedQuantity} />
            <Info label="Kháº£ dá»¥ng" value={available} tone={stockTone(row)} />
            <Info label="GiÃ¡ trá»‹ tá»“n" value={money(row.quantity * row.costPrice)} />
            <Info label="GiÃ¡ vá»‘n" value={money(row.costPrice)} />
            <Info label="GiÃ¡ bÃ¡n" value={money(row.salePrice)} />
            <Info label="Lá»£i nhuáº­n gá»™p/sp" value={money(row.salePrice - row.costPrice)} />
            <Info label="BiÃªn gá»™p" value={row.salePrice ? `${Math.round(((row.salePrice - row.costPrice) / row.salePrice) * 100)}%` : "0%"} />
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold">Giao dá»‹ch cá»§a mÃ£ hÃ ng</h3>
              <span className="text-sm font-semibold text-slate-500">{relatedTransactions.length} dÃ²ng gáº§n nháº¥t</span>
            </div>
            {relatedTransactions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">Thá»i gian</th><th className="px-4 py-3">Loáº¡i</th><th className="px-4 py-3">SL</th><th className="px-4 py-3">TrÆ°á»›c</th><th className="px-4 py-3">Sau</th><th className="px-4 py-3">Ghi chÃº</th></tr></thead>
                  <tbody>{relatedTransactions.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3">{dateText(item.createdAt)}</td><td className="px-4 py-3"><StatusBadge tone={transactionTone(item.type)}>{viType(item.type)}</StatusBadge></td><td className="px-4 py-3 font-semibold">{item.quantity}</td><td className="px-4 py-3">{item.beforeQuantity}</td><td className="px-4 py-3">{item.afterQuantity}</td><td className="px-4 py-3">{item.note || "-"}</td><td className="px-4 py-3 text-right"><button type="button" className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={() => { setSelectedTransaction(item) }}>Xem</button></td></tr>)}</tbody>
                </table>
              </div>
            ) : <EmptyState title="ChÆ°a cÃ³ giao dá»‹ch gáº§n Ä‘Ã¢y" description="CÃ¡c láº§n nháº­p, xuáº¥t, Ä‘iá»u chá»‰nh cá»§a mÃ£ hÃ ng nÃ y sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y." />}
          </section>
        </div>
      </section>
      {selectedTransaction ? <TransactionDetail transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} /> : null}
    </div>
  );
}

function TransactionDetail({ transaction, onClose }: { transaction: TransactionRow; onClose: () => void }) {
  const productHref = `/admin/products?search=${encodeURIComponent(transaction.sku)}`;
  const inventoryHref = `/admin/inventory?search=${encodeURIComponent(transaction.sku)}`;
  const delta = transaction.afterQuantity - transaction.beforeQuantity;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4">
      <section className="grid w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Chi tiết giao dịch kho</h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{transaction.id}</p>
          </div>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={productHref}>Mở sản phẩm</a>
            <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50" href={inventoryHref}>Mở tồn kho</a>
          </div>
          <section className="grid gap-3 md:grid-cols-3">
            <Info label="Sản phẩm" value={transaction.productName} />
            <Info label="SKU" value={transaction.sku} />
            <Info label="Loại" value={viType(transaction.type)} tone={transactionTone(transaction.type)} />
            <Info label="Số lượng ghi nhận" value={transaction.quantity} />
            <Info label="Tồn trước" value={transaction.beforeQuantity} />
            <Info label="Tồn sau" value={transaction.afterQuantity} />
            <Info label="Chênh lệch tồn" value={delta > 0 ? `+${delta}` : delta} tone={delta > 0 ? "emerald" : delta < 0 ? "red" : "slate"} />
            <Info label="Thời gian" value={dateText(transaction.createdAt)} />
            <Info label="Ghi chú" value={transaction.note || "-"} />
          </section>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string | number; tone?: Tone }) {
  const toneClass = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-900";
  return <div className="rounded-lg bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-500">{label}</span><strong className={`mt-1 block break-words text-sm ${toneClass}`}>{value}</strong></div>;
}

function InventoryModal({ modal, products, sessionToken, onClose }: { modal: Exclude<ModalState, { mode: "detail"; row: InventoryRow } | { mode: "transaction"; transaction: TransactionRow } | null>; products: InventoryRow[]; sessionToken: string; onClose: () => void }) {
  const title = modal.mode === "import" ? "Nháº­p kho" : modal.mode === "export" ? "Xuáº¥t kho" : "Äiá»u chá»‰nh tá»“n";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <form action="/api/admin/inventory" method="post" className="grid w-full max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <input type="hidden" name="sessionToken" value={sessionToken} />
        <input type="hidden" name="mode" value={modal.mode} />
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold">{title}</h2><Button variant="outline" onClick={onClose}>ÄÃ³ng</Button></div>
        <div className="grid gap-4 p-5">
          {modal.row ? <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">MÃ£ hÃ ng Ä‘ang chá»n</span><strong className="mt-1 block">{modal.row.sku} - {modal.row.name}</strong><p className="mt-1 text-xs text-slate-500">Tá»“n {modal.row.quantity} Â· Giá»¯ {modal.row.reservedQuantity} Â· Kháº£ dá»¥ng {availableOf(modal.row)}</p></div> : null}
          <Field label="Sáº£n pháº©m"><select className={inputClass} name="productId" defaultValue={modal.row?.productId || ""} required><option value="">Chá»n sáº£n pháº©m</option>{products.map((item) => <option key={item.productId} value={item.productId}>{item.sku} - {item.name}</option>)}</select></Field>
          {modal.mode === "adjust" ? <Field label="Tá»“n thá»±c táº¿"><input className={inputClass} name="actualQuantity" type="number" min="0" defaultValue={modal.row?.quantity || 0} required /></Field> : <Field label="Sá»‘ lÆ°á»£ng"><input className={inputClass} name="quantity" type="number" min="1" defaultValue={modal.suggestedQuantity || (modal.mode === "import" && modal.row ? suggestedImportQuantity(modal.row) : 1)} required /></Field>}
          <Field label="Ghi chÃº"><textarea className={textareaClass} name="note" rows={3} defaultValue={modal.suggestedNote || ""} placeholder={modal.mode === "export" ? "LÃ½ do xuáº¥t kho" : "Ghi chÃº"} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><Button variant="outline" onClick={onClose}>Huá»·</Button><Button type="submit">LÆ°u</Button></div>
      </form>
    </div>
  );
}

function RowButton({ label, icon, onClick }: { label: string; icon?: ReactNode; onClick: () => void }) {
  return <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50" onClick={onClick}>{icon}{label}</button>;
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

function isStaleInventory(row: InventoryRow) {
  if (!row.lastTransactionAt) return false;
  if (row.quantity <= 0 && row.reservedQuantity <= 0) return false;
  return Date.now() - new Date(row.lastTransactionAt).getTime() > 30 * 24 * 60 * 60 * 1000;
}

function matchesStockFilter(row: InventoryRow, stockFilter: string) {
  const available = availableOf(row);
  if (stockFilter === "LOW") return row.quantity <= row.minStock;
  if (stockFilter === "OUT") return available <= 0;
  if (stockFilter === "RESERVED") return row.reservedQuantity > 0;
  if (stockFilter === "NEGATIVE") return available < 0;
  if (stockFilter === "STALE") return isStaleInventory(row);
  if (stockFilter === "NO_TRANSACTION") return !row.lastTransactionAt;
  return available > 0;
}

function suggestedImportQuantity(row: InventoryRow) {
  const available = availableOf(row);
  const target = Math.max(row.minStock * 2, row.minStock + 5);
  return Math.max(1, target - available);
}

function purchaseHref(row: InventoryRow, quantity: number) {
  const params = new URLSearchParams({ productId: row.productId, quantity: String(quantity), note: "Táº¡o tá»« cáº£nh bÃ¡o tá»“n tháº¥p" });
  return `/admin/purchases?${params.toString()}`;
}

function inventoryExportHref(query: string, stockFilter: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  if (stockFilter) params.set("stock", stockFilter);
  const suffix = params.toString();
  return `/api/admin/inventory/export${suffix ? `?${suffix}` : ""}`;
}

function exportInventoryCsv(rows: InventoryRow[]) {
  const header = ["name", "sku", "category", "status", "quantity", "reservedQuantity", "available", "minStock", "costPrice", "salePrice", "inventoryValue", "lastTransactionAt", "updatedAt"];
  const body = rows.map((row) => [
    row.name,
    row.sku,
    row.categoryName || "",
    viStatus(row.status),
    row.quantity,
    row.reservedQuantity,
    availableOf(row),
    row.minStock,
    row.costPrice,
    row.salePrice,
    row.quantity * row.costPrice,
    row.lastTransactionAt ? dateText(row.lastTransactionAt) : "",
    dateText(row.updatedAt),
  ]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shoponline-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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
function viType(type: string) { return ({ IMPORT: "Nháº­p", EXPORT: "Xuáº¥t", ADJUST: "Äiá»u chá»‰nh", RETURN: "HoÃ n" } as Record<string, string>)[type] || type; }
function viStatus(status: string) { return ({ ACTIVE: "Äang bÃ¡n", DRAFT: "NhÃ¡p", HIDDEN: "áº¨n", ARCHIVED: "LÆ°u trá»¯" } as Record<string, string>)[status] || status; }

