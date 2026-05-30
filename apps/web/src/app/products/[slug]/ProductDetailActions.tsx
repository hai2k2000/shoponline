"use client";

import { useState } from "react";
import { StoreButton } from "@/components/public/ui";

type ProductCartItem = { id: string; name: string; sku: string; price: number; quantity: number };

export function ProductDetailActions({ product }: { product: ProductCartItem }) {
  const [message, setMessage] = useState("");

  function addToCart() {
    const current = JSON.parse(localStorage.getItem("shoponline.cart") || "[]") as ProductCartItem[];
    const existing = current.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else current.push({ ...product, quantity: 1 });
    localStorage.setItem("shoponline.cart", JSON.stringify(current));
    window.dispatchEvent(new Event("storage"));
    setMessage(`Đã thêm ${product.name} vào giỏ hàng.`);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StoreButton onClick={addToCart}>Thêm vào giỏ</StoreButton>
      <StoreButton href="/cart" variant="outline">Xem giỏ hàng</StoreButton>
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 sm:col-span-2">{message}</p> : null}
    </div>
  );
}
