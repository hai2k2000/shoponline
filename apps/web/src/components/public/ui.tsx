/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, PackageSearch, ShoppingCart } from "lucide-react";

export function StoreShell({ children, storeName = "ShopOnline", compact = false }: { children: ReactNode; storeName?: string; compact?: boolean }) {
  return (
    <main className="min-h-screen bg-blue-50/30 text-slate-950">
      <StoreHeader storeName={storeName} />
      <div className={compact ? "mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:px-8" : "mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8"}>{children}</div>
    </main>
  );
}

export function StoreHeader({ storeName = "ShopOnline" }: { storeName?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="min-w-0 text-lg font-semibold tracking-normal text-slate-950" href="/">{storeName}</Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-slate-700 sm:gap-3">
          <Link className="rounded-lg px-2 py-2 hover:bg-blue-50 sm:px-3" href="/products">Sản phẩm</Link>
          <Link className="rounded-lg px-2 py-2 hover:bg-blue-50 sm:px-3" href="/cart">Giỏ hàng</Link>
          <Link className="rounded-lg px-2 py-2 hover:bg-blue-50 sm:px-3" href="/tracking">Tra cứu</Link>
        </nav>
      </div>
    </header>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <section className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-blue-600">{eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-normal sm:text-3xl">{title}</h1>{description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}</div>{action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}</section>;
}

export function StoreButton({ children, href, type = "button", disabled, variant = "solid", onClick }: { children: ReactNode; href?: string; type?: "button" | "submit"; disabled?: boolean; variant?: "solid" | "outline"; onClick?: () => void }) {
  const className = `inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${variant === "solid" ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"}`;
  if (href && !disabled) return <Link className={className} href={href}>{children}</Link>;
  if (href && disabled) return <span aria-disabled="true" className={className}>{children}</span>;
  return <button className={className} type={type} disabled={disabled} onClick={onClick}>{children}</button>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-1 block text-xl font-semibold">{value}</strong>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</div>;
}

export function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  return <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">{src ? <img className="h-full w-full object-cover" src={src} alt={alt} /> : <div className="grid h-full place-items-center text-slate-300"><PackageSearch className="size-10" /></div>}</div>;
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>;
}

export function EmptyPanel({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="grid place-items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-12 text-center shadow-sm"><ShoppingCart className="size-9 text-slate-300" /><strong>{title}</strong><p className="max-w-md text-sm leading-6 text-slate-500">{description}</p>{action}</section>;
}

export function StatusPill({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{children}</span>;
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700" href={href}>{children}<ArrowRight className="size-4" /></Link>;
}

export const inputClass = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
export const textareaClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
export function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }
