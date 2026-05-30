"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductGallery({ urls, name }: { urls: string[]; name: string }) {
  const [active, setActive] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm">
        Chưa có ảnh
      </div>
    );
  }

  function prev() {
    setActive((i) => (i === 0 ? urls.length - 1 : i - 1));
  }

  function next() {
    setActive((i) => (i === urls.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="grid gap-3">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <img
          src={urls[active]}
          alt={`${name} - ảnh ${active + 1}`}
          className="aspect-square w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
        />
        {urls.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white"
              aria-label="Ảnh tiếp"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-2 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {active + 1} / {urls.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, index) => (
            <button
              key={index}
              onClick={() => setActive(index)}
              className={`shrink-0 overflow-hidden rounded border-2 transition-colors ${
                index === active ? "border-slate-800" : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <img
                src={url}
                alt={`${name} thumbnail ${index + 1}`}
                className="size-16 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
