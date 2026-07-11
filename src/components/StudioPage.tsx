"use client";

import { useEffect, useRef, useState } from "react";
import { STYLES } from "@/lib/styles";
import { BRAND_NAME, PARENT_BRAND } from "@/lib/brand";

type Stage = "idle" | "generating" | "done";

const PACKS = [
  { key: "starter", usd: 2.99, credits: 5, tag: "First-time favorite" },
  { key: "standard", usd: 4.99, credits: 20, tag: "Most popular" },
  { key: "big", usd: 9.99, credits: 50, tag: "Best value" },
];

/** Client-only lazy anon id — created on first use, stable afterwards. */
function getAnonId(): string {
  let v = localStorage.getItem("anon_id");
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem("anon_id", v);
  }
  return v;
}

export function StudioPage() {
  const [freeLeft, setFreeLeft] = useState<number | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "done">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/me?anonId=${getAnonId()}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.freeLeft === "number") setFreeLeft(d.freeLeft);
        if (typeof d.credits === "number") setCredits(d.credits);
      })
      .catch(() => {});
  }, []);

  function pickFile(f: File) {
    setFile(f);
    setPhotoUrl(URL.createObjectURL(f));
    setError(null);
    setResultUrl(null);
    setJobId(null);
    setUnlocked(false);
    setStage("idle");
    stylesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generate() {
    if (!file || !styleId) return;
    const anonId = getAnonId();
    setError(null);
    setStage("generating");
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("styleId", styleId);
      form.append("anonId", anonId);
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed — you were not charged.");
      setResultUrl(data.previewDataUrl);
      setJobId(data.jobId);
      setUnlocked(Boolean(data.unlocked));
      if (typeof data.freeLeft === "number") setFreeLeft(data.freeLeft);
      if (typeof data.credits === "number") setCredits(data.credits);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStage("idle");
    }
  }

  async function unlockHd() {
    if (!jobId) return;
    const anonId = getAnonId();
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, anonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not unlock HD.");
      setUnlocked(true);
      setCredits((c) => Math.max(0, c - 1));
      const a = document.createElement("a");
      a.href = data.url;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock HD.");
    } finally {
      setUnlocking(false);
    }
  }

  async function downloadHd() {
    if (!jobId) return;
    // Already unlocked (credit generation) — unlock endpoint just issues a
    // fresh one-time link without charging again.
    await unlockHd();
  }

  async function buyPack(key: string) {
    const anonId = getAnonId();
    setBusyPack(key);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: key, anonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed.");
      if (typeof data.credits === "number") setCredits(data.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusyPack(null);
    }
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setEmailState("sending");
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, jobId }),
      });
      setEmailState("done");
    } catch {
      setEmailState("idle");
    }
  }

  const selectedStyle = STYLES.find((s) => s.id === styleId) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-amber-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8">
        <span className="text-sm font-semibold tracking-widest text-amber-800">{BRAND_NAME}</span>
        <span className="rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium text-zinc-600">
          {freeLeft === null ? "…" : freeLeft > 0 ? `${freeLeft} free ${freeLeft === 1 ? "try" : "tries"} left` : `${credits} credits`}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-10">
        {/* Hero */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-zinc-800 sm:text-5xl">
            Your pet, painted twelve ways
          </h1>
          <p className="max-w-xl text-lg text-zinc-600">
            Upload one photo, pick a style, and see a free preview before you spend anything.
          </p>
          <p className="text-sm font-medium text-amber-900">
            We recreate from what we can see. We never guess.
          </p>
        </section>

        {/* Upload */}
        <section className="mx-auto w-full max-w-xl">
          <label
            className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-white/70 p-6 text-center transition hover:border-amber-500 hover:bg-white"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) pickFile(f);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            {photoUrl ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Your pet" className="h-24 w-24 rounded-xl object-cover" />
                <div className="text-left">
                  <p className="font-medium text-zinc-700">Photo ready — pick a style below</p>
                  <p className="text-xs text-zinc-400">Click to change the photo</p>
                </div>
              </div>
            ) : (
              <>
                <span className="text-xl font-semibold text-zinc-700">Upload your pet&apos;s photo</span>
                <span className="text-sm text-zinc-500">JPG, PNG or WEBP · up to 10MB · face clearly visible</span>
                <span className="mt-1 rounded-full bg-amber-800 px-6 py-2.5 text-sm font-medium text-white">
                  Choose a photo
                </span>
              </>
            )}
          </label>
          <p className="mt-2 text-center text-xs text-zinc-400">
            If we can&apos;t see your pet&apos;s face clearly, we&apos;ll ask for another photo instead of guessing.
          </p>
        </section>

        {/* Styles */}
        <section ref={stylesRef} className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-800">Twelve looks. Pick the one that feels like them.</h2>
            <p className="mt-1 text-sm text-zinc-500">Every style keeps your pet&apos;s own colors and markings front of mind.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`group relative overflow-hidden rounded-2xl border-2 text-left transition ${
                  styleId === s.id ? "border-amber-700 shadow-md" : "border-transparent hover:border-amber-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/styles/${s.id}.jpg`}
                  alt={s.name}
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 -z-10" style={{ background: s.accent }} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  {s.occasion && (
                    <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-medium text-white">
                      Occasion
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Action bar / generating / result */}
        <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5">
          {stage === "generating" && photoUrl ? (
            <div className="relative w-full overflow-hidden rounded-2xl border border-amber-200 bg-amber-100" style={{ aspectRatio: "1 / 1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Painting in progress" className="absolute inset-0 h-full w-full scale-105 object-cover blur-md brightness-95" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/25 px-6 text-center">
                <span aria-hidden className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white" />
                <p className="text-lg font-medium text-white drop-shadow">Painting your portrait…</p>
                <p className="text-sm text-white/85 drop-shadow">This usually takes 30–60 seconds.</p>
              </div>
            </div>
          ) : stage === "done" && resultUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultUrl} alt="Your pet portrait" className="w-full rounded-2xl border border-amber-200 shadow-sm" />
              {!unlocked ? (
                <>
                  <p className="text-center text-sm text-zinc-500">
                    Free preview — 512px, watermarked. The HD original is already painted and saved.
                  </p>
                  <button
                    onClick={unlockHd}
                    disabled={unlocking}
                    className="rounded-full bg-amber-800 px-7 py-3.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-60"
                  >
                    {unlocking ? "Unlocking…" : "Unlock HD (no watermark) — 1 credit"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm font-medium text-emerald-700">
                    HD unlocked. Thank you for celebrating them with us.
                  </p>
                  <button
                    onClick={downloadHd}
                    disabled={unlocking}
                    className="rounded-full bg-amber-800 px-7 py-3.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-60"
                  >
                    {unlocking ? "Preparing…" : "Download HD again"}
                  </button>
                  <p className="text-xs text-zinc-400">{PARENT_BRAND} — keeping the bond alive.</p>
                  {emailState !== "done" ? (
                    <form onSubmit={subscribe} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-amber-500"
                        aria-label="Email address"
                      />
                      <button type="submit" disabled={emailState === "sending"} className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-60">
                        {emailState === "sending" ? "…" : "Keep me posted"}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-zinc-500">Thank you — we&apos;ll be in touch.</p>
                  )}
                </>
              )}
              <button
                onClick={() => {
                  setStage("idle");
                  setResultUrl(null);
                  setJobId(null);
                  setUnlocked(false);
                  stylesRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
              >
                Try another style
              </button>
            </>
          ) : (
            <>
              <button
                onClick={generate}
                disabled={!file || !styleId}
                className="rounded-full bg-amber-800 px-8 py-3.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedStyle ? `Paint it in ${selectedStyle.name}` : "Pick a style to start"}
              </button>
              <p className="text-center text-xs text-zinc-400">
                {freeLeft && freeLeft > 0
                  ? `Uses 1 of your ${freeLeft} free tries — you'll get a watermarked preview first.`
                  : "Uses 1 credit — full HD, no watermark, yours to keep."}
              </p>
            </>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </section>

        {/* Packs */}
        <section className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-zinc-800">HD portraits, by the pack</h2>
            <p className="mt-1 text-sm text-zinc-500">1 credit = 1 HD portrait, no watermark. Credits never expire.</p>
          </div>
          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
            {PACKS.map((p) => (
              <div key={p.key} className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-6 text-center">
                <span className="text-xs font-medium uppercase tracking-wide text-amber-800">{p.tag}</span>
                <span className="text-3xl font-semibold text-zinc-800">${p.usd}</span>
                <span className="text-sm text-zinc-500">{p.credits} credits</span>
                <button
                  onClick={() => buyPack(p.key)}
                  disabled={busyPack !== null}
                  className="mt-2 rounded-full bg-amber-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-900 disabled:opacity-60"
                >
                  {busyPack === p.key ? "…" : `Get ${p.credits} credits`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-200 py-6 text-center text-xs text-zinc-400">
        by {PARENT_BRAND}
      </footer>
    </div>
  );
}
