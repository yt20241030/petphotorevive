"use client";

import { useState } from "react";

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  aspectClass = "aspect-square",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectClass?: string;
}) {
  const [pos, setPos] = useState(50);

  return (
    <div className="relative w-full select-none overflow-hidden rounded-2xl border border-amber-200 shadow-sm">
      <div className={`relative ${aspectClass} w-full bg-amber-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterSrc} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="h-full w-full max-w-none object-cover"
            style={{ width: `${(100 / pos) * 100}%` }}
            draggable={false}
          />
        </div>
        <div
          className="absolute inset-y-0 w-0.5 bg-white/90 shadow"
          style={{ left: `${pos}%` }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          {afterLabel}
        </span>
      </div>
      <input
        type="range"
        min={2}
        max={98}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-3 mx-auto block w-[92%] accent-amber-700"
        aria-label="Drag to compare before and after"
      />
    </div>
  );
}
