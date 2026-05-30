import type { ReactNode } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";

export type Tone = "slate" | "emerald" | "amber" | "red" | "blue";

const toneStyles: Record<Tone, string> = {
  slate: "border-slate-200 bg-white text-slate-950",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
};

const badgeStyles: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function AdminPage({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-5">{children}</div></main>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}

export function Button({ children, tone = "slate", variant = "solid", type = "button", disabled, onClick }: { children: ReactNode; tone?: Tone; variant?: "solid" | "outline"; type?: "button" | "submit"; disabled?: boolean; onClick?: () => void }) {
  const solid = tone === "slate" ? "bg-slate-950 text-white hover:bg-slate-800" : `${toneStyles[tone]} border hover:brightness-95`;
  const outline = "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${variant === "solid" ? solid : outline}`}>{children}</button>;
}

export function StatCard({ label, value, hint, tone = "slate" }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return <article className={`rounded-lg border p-4 shadow-sm ${toneStyles[tone]}`}><span className="text-sm font-medium opacity-75">{label}</span><strong className="mt-2 block text-2xl font-semibold">{value}</strong>{hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}</article>;
}

export function FilterBar({ children, resultText }: { children: ReactNode; resultText?: string }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_auto]"><div className="grid gap-3 md:grid-cols-3">{children}</div>{resultText ? <div className="flex items-end text-sm font-semibold text-slate-600">{resultText}</div> : null}</div></section>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="grid gap-1 text-sm font-semibold text-slate-700"><span>Tìm kiếm</span><span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></span></label>;
}

export function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-semibold text-slate-700"><span>{label}</span><select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

export function DataPanel({ children }: { children: ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto">{children}</div></section>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="grid place-items-center gap-2 px-4 py-12 text-center"><AlertCircle className="size-8 text-slate-300" /><strong className="text-sm text-slate-700">{title}</strong><p className="max-w-md text-sm text-slate-500">{description}</p></div>;
}

export function StatusBadge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badgeStyles[tone]}`}>{children}</span>;
}

export function ModalShell({ title, children, footer, onClose, width = "max-w-3xl" }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; width?: string }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><section className={`grid max-h-[calc(100vh-2rem)] w-full ${width} overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl`}><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 className="min-w-0 text-lg font-semibold text-slate-950">{title}</h2><Button variant="outline" onClick={onClose}>Đóng</Button></div><div className="overflow-y-auto p-5">{children}</div>{footer ? <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div> : null}</section></div>;
}

export function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm"><span className="font-semibold text-slate-600">Trang {page} / {pageCount}</span><div className="flex gap-2"><button className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-50" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước"><ChevronLeft className="size-4" /></button><button className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-50" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label="Trang sau"><ChevronRight className="size-4" /></button></div></div>;
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>;
}

export const inputClass = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
export const textareaClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
