"use client";

import { useState } from "react";
import { ImagePlus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button, Field, inputClass } from "@/components/admin/ui";

type GalleryImage = { id: string; imageUrl: string; sortOrder: number };

export function ProductGalleryPanel({
  productId,
  images,
  sessionToken,
}: {
  productId: string;
  images: GalleryImage[];
  sessionToken: string;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append("sessionToken", sessionToken);
    fd.append("productId", productId);
    fd.append("imageUrl", newUrl.trim());
    await fetch("/api/admin/products/images", { method: "POST", body: fd });
    setNewUrl("");
    setSubmitting(false);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa ảnh này?")) return;
    const fd = new FormData();
    fd.append("sessionToken", sessionToken);
    fd.append("mode", "delete");
    fd.append("id", id);
    fd.append("productId", productId);
    await fetch("/api/admin/products/images", { method: "POST", body: fd });
    window.location.reload();
  }

  async function handleReorder(ids: string[]) {
    const fd = new FormData();
    fd.append("sessionToken", sessionToken);
    fd.append("mode", "reorder");
    fd.append("productId", productId);
    fd.append("ids", ids.join(","));
    await fetch("/api/admin/products/images", { method: "POST", body: fd });
    window.location.reload();
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const ids = sorted.map((img) => img.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    handleReorder(ids);
  }

  function moveDown(index: number) {
    if (index === sorted.length - 1) return;
    const ids = sorted.map((img) => img.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    handleReorder(ids);
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <Field label="Thêm ảnh (URL)" wide>
          <input
            className={inputClass}
            placeholder="https://..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={submitting || !newUrl.trim()}>
          <ImagePlus className="mr-2 size-4" />
          Thêm
        </Button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có ảnh gallery. Thêm URL ảnh ở trên.</p>
      ) : (
        <div className="grid gap-2">
          {sorted.map((img, index) => (
            <div
              key={img.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2"
            >
              <img
                src={img.imageUrl}
                alt={`Ảnh ${index + 1}`}
                className="size-16 rounded object-cover border border-slate-100 bg-slate-50"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
              />
              <span className="flex-1 truncate text-xs text-slate-600">{img.imageUrl}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="inline-flex size-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  title="Lên"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === sorted.length - 1}
                  className="inline-flex size-8 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                  title="Xuống"
                >
                  <ArrowDown className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="inline-flex size-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
                  title="Xóa"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
