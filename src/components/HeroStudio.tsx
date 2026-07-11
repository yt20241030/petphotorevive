"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { RestoreStudio, type StudioStage } from "./RestoreStudio";

const WORKS_BEST = [
  "Faded or yellowed old photos",
  "Scratched or damaged prints",
  "Low-resolution or grainy shots",
  "Black & white photos",
];

const LIMITED = [
  "Heavily blurred / out-of-focus shots",
  "Overexposed photos where details are washed out",
];

/**
 * Owns the hero + upload area. Once the visitor uploads their own photo,
 * the example slider steps aside and their photo becomes the page's main
 * visual — in a memorial context the example must never compete with
 * someone's own pet.
 */
export function HeroStudio() {
  const [stage, setStage] = useState<StudioStage>("idle");
  const isIdle = stage === "idle";

  return (
    <>
      <section className="flex flex-col items-center gap-5 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-zinc-800 sm:text-5xl">
          Bring your pet&apos;s old photos back to life
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          AI-powered restoration. See your free preview — pay only if you love it.
        </p>
        {isIdle && (
          <div className="mt-4 w-full max-w-2xl">
            <BeforeAfterSlider
              beforeSrc="/demo/hero-before.jpg"
              afterSrc="/demo/hero-after.jpg"
              aspectClass="aspect-[3/2]"
            />
            <p className="mt-2 text-xs text-zinc-400">
              Real restoration of a 1900s postcard photograph. Drag to compare.
            </p>
          </div>
        )}
      </section>

      {/* Single RestoreStudio instance — only the wrapper layout changes,
          so upload state survives the idle -> uploading layout switch. */}
      <section className={isIdle ? "grid items-start gap-8 md:grid-cols-[3fr_2fr]" : "mx-auto w-full max-w-3xl"}>
        <RestoreStudio onStageChange={setStage} />
        {isIdle && (
          <aside className="rounded-2xl bg-white/70 p-6">
            <h2 className="text-sm font-semibold text-zinc-700">Works best on:</h2>
            <ul className="mt-3 space-y-2">
              {WORKS_BEST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                  <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-sm font-semibold text-zinc-700">Limited results on:</h2>
            <ul className="mt-3 space-y-2">
              {LIMITED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-500">
                  <span aria-hidden className="mt-0.5 text-zinc-400">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </section>
    </>
  );
}
