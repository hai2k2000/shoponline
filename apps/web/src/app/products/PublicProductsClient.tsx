"use client";

import { useMemo, useState } from "react";
import { EmptyPanel, inputClass, money, ProductImage, StoreButton, StatusPill } from "@/components/public/ui";

type ProductRow = { id: string; name: string; slug: string; sku: string; shortDescription: string | null; salePrice: number; promotionPrice: number | null; thumbnail: string | null; available: number; categoryId: string | null; categoryName: string | null };
type CategoryOption = { id: string; name: string };

export function PublicProductsClient({ products, categories }: { products: ProductRow[]; categories: CategoryOption[] }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchTerm = !term || [product.name, product.sku, product.shortDescription || "", product.categoryName || ""].some((v) => v.toLowerCase().includes(term));
      const matchCat = !categoryId || product.categoryId === categoryId;
      return matchTerm && matchCat;
    });
  }, [products, query]);

  const addToCart = (product: ProductRow) => {
    const current = JSON.parse(localStorage.getItem("shoponline.cart") || "[]") as Array<{ id: string; name: string; sku: string; price: number; quantity: number }>;
    const existing = current.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else current.push({ id: product.id, name: product.name, sku: product.sku, price: product.promotionPrice || product.salePrice, quantity: 1 });
    localStorage.setItem("shoponline.cart", JSON.stringify(current));
    window.dispatchEvent(new Event("storage"));
    setMessage(`Đã thêm ${product.name} vào giỏ hàng.`);
  };

  return (
    <section className="grid gap-5 pb-10">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold text-slate-700">Tìm kiếm sản phẩm<input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên sản phẩm, SKU, mô tả" /></label><label className="grid gap-1 text-sm font-semibold text-slate-700">Danh mục<select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Tất cả danh mục</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>{message ? <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{message}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visibleProducts.map((product) => <article key={product.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><ProductImage src={product.thumbnail} alt={product.name} /><div><div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{product.name}</h2><StatusPill>Còn {product.available}</StatusPill></div><p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.shortDescription || product.sku}</p></div><div><strong className="block text-lg">{money(product.promotionPrice || product.salePrice)}</strong>{product.promotionPrice ? <span className="text-sm text-slate-400 line-through">{money(product.salePrice)}</span> : null}</div><div className="grid gap-2"><StoreButton href={`/products/${product.slug}`} variant="outline">Xem chi tiết</StoreButton><StoreButton disabled={product.available <= 0} onClick={() => addToCart(product)}>{product.available > 0 ? "Thêm vào giỏ" : "Hết hàng"}</StoreButton></div></article>)}</div>
      {!visibleProducts.length ? <EmptyPanel title="Chưa có sản phẩm phù hợp" description="Thử đổi từ khóa tìm kiếm hoặc quay lại sau khi cửa hàng cập nhật thêm hàng." /> : null}
    </section>
  );
}
