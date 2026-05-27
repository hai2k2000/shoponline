"use client";

/* eslint-disable @next/next/no-img-element */

type ProductRow = { id: string; name: string; slug: string; sku: string; shortDescription: string | null; salePrice: number; promotionPrice: number | null; thumbnail: string | null; available: number };

export function PublicProductsClient({ products }: { products: ProductRow[] }) {
  const addToCart = (product: ProductRow) => {
    const current = JSON.parse(localStorage.getItem("shoponline.cart") || "[]") as Array<{ id: string; name: string; sku: string; price: number; quantity: number }>;
    const existing = current.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else current.push({ id: product.id, name: product.name, sku: product.sku, price: product.promotionPrice || product.salePrice, quantity: 1 });
    localStorage.setItem("shoponline.cart", JSON.stringify(current));
    window.dispatchEvent(new Event("storage"));
    alert("Đã thêm vào giỏ hàng.");
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <article key={product.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">{product.thumbnail ? <img className="h-full w-full object-cover" src={product.thumbnail} alt={product.name} /> : null}</div>
          <div><h2 className="font-semibold">{product.name}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.shortDescription || product.sku}</p></div>
          <div className="flex items-end justify-between gap-3"><div><strong className="block text-lg">{money(product.promotionPrice || product.salePrice)}</strong>{product.promotionPrice ? <span className="text-sm text-slate-400 line-through">{money(product.salePrice)}</span> : null}</div><span className="text-xs font-semibold text-slate-500">Còn {product.available}</span></div>
          <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={product.available <= 0} onClick={() => addToCart(product)}>{product.available > 0 ? "Thêm vào giỏ" : "Hết hàng"}</button>
        </article>
      ))}
      {!products.length ? <div className="col-span-full rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Chưa có sản phẩm đang bán.</div> : null}
    </section>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}
