"use client";

import { useMemo, useState, useTransition } from "react";
import { archiveSupplierAction, createSupplierAction, updateSupplierAction } from "./actions";

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  note: string | null;
  status: string;
  debtCount: number;
  openDebt: number;
};

type ModalState = { mode: "create" } | { mode: "edit"; row: SupplierRow } | { mode: "detail"; row: SupplierRow } | null;

const statuses = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"];

export function SuppliersClient({ rows }: { rows: SupplierRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTerm = !term || [row.name, row.phone || "", row.email || "", row.address || "", row.taxCode || ""].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (!status || row.status === status);
    });
  }, [query, rows, status]);

  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const openDebt = rows.reduce((sum, row) => sum + row.openDebt, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Admin / Nhà cung cấp</p>
            <h1 className="text-3xl font-semibold">Quản lý nhà cung cấp</h1>
            <p className="mt-1 text-sm text-slate-600">Hồ sơ nhà cung cấp, liên hệ, mã số thuế và công nợ mua hàng.</p>
          </div>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={() => setModal({ mode: "create" })}>Tạo nhà cung cấp</button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Tổng nhà cung cấp" value={rows.length} />
          <Metric label="Đang hoạt động" value={activeCount} />
          <Metric label="Hồ sơ có công nợ" value={rows.filter((row) => row.debtCount > 0).length} />
          <Metric label="Công nợ mở" value={money(openDebt)} />
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Tìm kiếm
            <input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, SĐT, email, mã số thuế" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Trạng thái
            <select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả</option>
              {statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}
            </select>
          </label>
          <div className="flex items-end text-sm font-semibold text-slate-600">{filtered.length} dòng</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Mã số thuế</th>
                  <th className="px-4 py-3">Công nợ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3"><strong>{row.name}</strong><p className="mt-1 text-xs text-slate-500">{row.address || "Chưa có địa chỉ"}</p></td>
                    <td className="px-4 py-3">{row.phone || "-"}<p className="text-xs text-slate-500">{row.email || ""}</p></td>
                    <td className="px-4 py-3">{row.taxCode || "-"}</td>
                    <td className="px-4 py-3">{money(row.openDebt)}<p className="text-xs text-slate-500">{row.debtCount} khoản</p></td>
                    <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{viStatus(row.status)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "detail", row })}>Xem</button>
                        <button className="rounded-lg border border-slate-300 px-3 py-2 font-semibold" onClick={() => setModal({ mode: "edit", row })}>Sửa</button>
                        {row.status !== "ARCHIVED" ? <ArchiveButton row={row} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>Không có nhà cung cấp phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal?.mode === "detail" ? <SupplierDetail row={modal.row} onClose={() => setModal(null)} /> : modal ? <SupplierModal modal={modal} onClose={() => setModal(null)} /> : null}
    </main>
  );
}

function SupplierModal({ modal, onClose }: { modal: Exclude<ModalState, null | { mode: "detail"; row: SupplierRow }>; onClose: () => void }) {
  const row = modal.mode === "edit" ? modal.row : null;
  const action = row ? updateSupplierAction : createSupplierAction;
  const [pending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); startTransition(async () => { await action(formData); window.location.reload(); }); }} className="grid w-full max-w-3xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xl font-semibold">{row ? "Sửa nhà cung cấp" : "Tạo nhà cung cấp"}</h2>
          <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button>
        </div>
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Tên nhà cung cấp<input required className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="name" defaultValue={row?.name || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">SĐT<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="phone" defaultValue={row?.phone || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Email<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="email" type="email" defaultValue={row?.email || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Mã số thuế<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="taxCode" defaultValue={row?.taxCode || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Trạng thái<select className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="status" defaultValue={row?.status || "ACTIVE"}>{statuses.map((item) => <option key={item} value={item}>{viStatus(item)}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Địa chỉ<input className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="address" defaultValue={row?.address || ""} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Ghi chú<textarea className="rounded-lg border border-slate-300 px-3 py-2 font-normal" name="note" rows={4} defaultValue={row?.note || ""} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Huỷ</button>
          <button type="submit" className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </form>
    </div>
  );
}

function ArchiveButton({ row }: { row: SupplierRow }) {
  const [pending, startTransition] = useTransition();
  return <button className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 disabled:opacity-60" disabled={pending} onClick={() => { if (!confirm("Lưu trữ nhà cung cấp này?")) return; const formData = new FormData(); formData.set("id", row.id); startTransition(async () => { await archiveSupplierAction(formData); window.location.reload(); }); }}>{pending ? "Đang lưu..." : "Lưu trữ"}</button>;
}

function SupplierDetail({ row, onClose }: { row: SupplierRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section className="grid w-full max-w-2xl gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xl font-semibold">{row.name}</h2>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={onClose}>Đóng</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="SĐT" value={row.phone || "-"} />
          <Info label="Email" value={row.email || "-"} />
          <Info label="Mã số thuế" value={row.taxCode || "-"} />
          <Info label="Trạng thái" value={viStatus(row.status)} />
          <Info label="Công nợ mở" value={money(row.openDebt)} />
          <Info label="Số khoản công nợ" value={row.debtCount} />
          <Info label="Địa chỉ" value={row.address || "-"} wide />
          <Info label="Ghi chú" value={row.note || "-"} wide />
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

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function viStatus(status: string) {
  return ({ ACTIVE: "Đang hoạt động", DRAFT: "Nháp", HIDDEN: "Ẩn", ARCHIVED: "Lưu trữ" } as Record<string, string>)[status] || status;
}
