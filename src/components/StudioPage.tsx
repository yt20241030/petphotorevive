"use client";

// Portrait studio page — visual design ported faithfully from 1号美图
// (editorial layout: huge black titles, tilted paper-white cards on warm
// cream, numbered style gallery, gallery-mounted result). Engine/credits
// are this project's Replicate + Blob infrastructure. Red lines: no future
// -product mentions (the original's leather waitlist is NOT ported), no
// trademarked characters, honest copy.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STYLES, type PortraitStyle } from "@/lib/styles";
import { BRAND_NAME, PARENT_BRAND } from "@/lib/brand";

type Step =
  | { name: "gallery" }
  | { name: "confirm"; style: PortraitStyle }
  | { name: "generating"; style: PortraitStyle }
  | { name: "result"; style: PortraitStyle };

const PACKS = [
  { key: "starter", name: "Starter", usd: 2.99, credits: 5 },
  { key: "standard", name: "Most popular", usd: 4.99, credits: 20, highlight: true },
  { key: "big", name: "Best value", usd: 9.99, credits: 50 },
];

const PAINTING_STEPS = [
  "Reading the photo…",
  "Sketching the pose…",
  "Mixing pigments…",
  "Laying down color…",
  "Final touches…",
];

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
  const [credits, setCredits] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>({ name: "gallery" });
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/me?anonId=${getAnonId()}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.freeLeft === "number") setFreeLeft(d.freeLeft);
        if (typeof d.credits === "number") setCredits(d.credits);
      })
      .catch(() => {});
  }, []);

  function handleUpload(f: File) {
    setFile(f);
    setPhotoUrl(URL.createObjectURL(f));
    setError(null);
  }

  function pickStyle(style: PortraitStyle) {
    if (!photoUrl) {
      setError("Upload a pet photo first — the styles need something to paint.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(null);
    setStep({ name: "confirm", style });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startGenerate(style: PortraitStyle) {
    if (!file) return;
    setError(null);
    setStep({ name: "generating", style });
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("styleId", style.id);
      form.append("anonId", getAnonId());
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed — you were not charged.");
      setResultUrl(data.previewDataUrl);
      setJobId(data.jobId);
      setUnlocked(Boolean(data.unlocked));
      if (typeof data.freeLeft === "number") setFreeLeft(data.freeLeft);
      if (typeof data.credits === "number") setCredits(data.credits);
      setStep({ name: "result", style });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStep({ name: "gallery" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function unlockHd() {
    if (!jobId) return;
    setUnlocking(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, anonId: getAnonId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not unlock HD.");
      if (!unlocked) setCredits((c) => Math.max(0, c - 1));
      setUnlocked(true);
      const a = document.createElement("a");
      a.href = data.url;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock HD.");
    } finally {
      setUnlocking(false);
    }
  }

  async function buyPack(key: string) {
    setBusyPack(key);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: key, anonId: getAnonId() }),
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7ed] text-stone-950">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-40">
        <nav className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-3 px-5 sm:px-9 lg:px-14">
          <Link
            className="rounded-full bg-white/72 px-4 py-2 text-sm font-black tracking-[0.22em] shadow-sm ring-1 ring-amber-900/10 backdrop-blur"
            href="/"
            aria-label={`${BRAND_NAME} home`}
          >
            {BRAND_NAME}
            <span className="ml-2 hidden text-[0.62rem] tracking-[0.2em] text-amber-800/70 sm:inline">STUDIO</span>
          </Link>
          <div className="flex items-center gap-2">
            {credits > 0 && (
              <span className="rounded-full bg-stone-950 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-white shadow-sm">
                {credits} credits
              </span>
            )}
            <span className="rounded-full bg-white/62 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-amber-900 shadow-sm ring-1 ring-amber-900/10 backdrop-blur">
              {freeLeft === null ? "…" : `${freeLeft} free ${freeLeft === 1 ? "try" : "tries"}`}
            </span>
          </div>
        </nav>
      </header>

      {error && (
        <div className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-9 lg:px-14">
          <p className="rounded-[1.4rem] bg-[#f5dfc8] px-6 py-4 text-sm font-black leading-6 text-amber-950 ring-1 ring-amber-900/15">
            {error}
          </p>
        </div>
      )}

      {step.name === "gallery" && (
        <>
          {/* Editorial hero: huge black title + sketchbook upload card */}
          <section className="relative bg-[#fff2df] px-5 pb-16 pt-32 sm:px-9 lg:px-14 lg:pb-20">
            <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="mb-5 text-xs font-black uppercase leading-relaxed tracking-[0.24em] text-amber-900/68">
                  Custom pet portrait studio — eleven hand-tuned styles
                </p>
                <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl lg:text-[5.4rem]">
                  AI pet portraits,
                  <br />
                  from one photo.
                </h1>
                <p className="mt-6 max-w-[30rem] text-base leading-8 text-stone-700 sm:text-lg">
                  One photo in, a gallery-grade portrait out. Christmas cards, birthday looks, new styles
                  all year — there&apos;s always a reason for one more.
                  {freeLeft && freeLeft > 0 ? ` First ${freeLeft} ${freeLeft === 1 ? "try is" : "tries are"} on us.` : ""}
                </p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-amber-900/60">
                  We recreate from what we can see. We never guess.
                </p>
              </div>

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="studio-upload"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <label
                  htmlFor="studio-upload"
                  className="group block -rotate-1 cursor-pointer rounded-[1.8rem] bg-white p-4 pb-6 shadow-[0_28px_90px_rgba(120,72,38,0.18)] ring-1 ring-amber-900/10 transition hover:rotate-0 hover:shadow-[0_34px_110px_rgba(120,72,38,0.24)]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleUpload(f);
                  }}
                >
                  <div className="relative aspect-[5/4] overflow-hidden rounded-[1.2rem] border-2 border-dashed border-amber-900/25 bg-[#fffaf3]">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 text-2xl font-black text-white transition group-hover:bg-amber-900">
                          +
                        </span>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-900/60">
                          Drop the photo here
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-end justify-between px-1">
                    <div>
                      <p className="text-lg font-black tracking-[-0.02em]">
                        {photoUrl ? "Photo ready — pick a style" : "Upload your pet photo"}
                      </p>
                      <p className="text-xs font-bold text-stone-500">
                        JPG / PNG / WebP · pet&apos;s face clearly visible
                      </p>
                    </div>
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-amber-800/50">No.01</span>
                  </div>
                </label>
                <p className="mt-4 px-2 text-xs font-bold leading-6 text-stone-500">
                  {credits > 0
                    ? `Each HD portrait costs 1 credit — ${credits} left.`
                    : `First ${freeLeft ?? 3} portraits are free 512px previews with a watermark. HD unlock comes with credits.`}
                </p>
              </div>
            </div>
          </section>

          {/* Style gallery: numbered tilted cards */}
          <section className="px-5 py-16 sm:px-9 lg:px-14 lg:py-24">
            <div className="mx-auto max-w-[1320px]">
              <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-amber-800/70">The styles</p>
                  <h2 className="max-w-2xl text-4xl font-black leading-none tracking-[-0.04em] sm:text-6xl">
                    Eleven looks. Pick the one that feels like them.
                  </h2>
                </div>
                <p className="max-w-xs text-sm leading-7 text-stone-600 lg:text-right">
                  Every style is a tuned recipe, not a filter. Tap any card to start painting.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
                {STYLES.map((style, index) => (
                  <StyleCard key={style.id} style={style} index={index} onPick={() => pickStyle(style)} />
                ))}
              </div>
            </div>
          </section>

          <CreditPacks busyPack={busyPack} onBuy={buyPack} />
          <Footer email={email} emailState={emailState} onEmail={setEmail} onSubscribe={subscribe} />
        </>
      )}

      {step.name === "confirm" && photoUrl && (
        <section className="mx-auto max-w-[880px] px-5 pb-24 pt-36">
          <div className="grid items-center gap-8 sm:grid-cols-[auto_auto_auto] sm:justify-center">
            <div className="-rotate-2 rounded-[1.4rem] bg-white p-3 pb-5 shadow-[0_24px_80px_rgba(120,72,38,0.18)] ring-1 ring-amber-900/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Your photo" className="h-44 w-44 rounded-[1rem] object-cover" />
              <p className="mt-3 text-center text-[0.62rem] font-black uppercase tracking-[0.2em] text-stone-500">
                Your photo
              </p>
            </div>
            <span className="justify-self-center text-4xl font-black text-amber-900/50">→</span>
            <div className="rotate-2 rounded-[1.4rem] bg-white p-3 pb-5 shadow-[0_24px_80px_rgba(120,72,38,0.18)] ring-1 ring-amber-900/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/styles/${step.style.id}.jpg`} alt={step.style.name} className="h-44 w-44 rounded-[1rem] object-cover" />
              <p className="mt-3 text-center text-[0.62rem] font-black uppercase tracking-[0.2em] text-stone-500">
                {step.style.name}
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-4xl font-black leading-none tracking-[-0.04em] sm:text-5xl">
              Paint it in {step.style.name}?
            </h2>
            <p className="mt-4 text-sm font-bold leading-7 text-stone-600">
              {freeLeft && freeLeft > 0
                ? `Uses 1 of your ${freeLeft} free ${freeLeft === 1 ? "try" : "tries"} — you'll get a 512px watermarked preview.`
                : "Uses 1 credit — full HD, no watermark, yours to keep."}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => setStep({ name: "gallery" })}
                className="rounded-full bg-white/75 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-amber-900 ring-1 ring-amber-900/12 backdrop-blur transition hover:bg-white"
              >
                Back
              </button>
              <button
                onClick={() => startGenerate(step.style)}
                className="rounded-full bg-stone-950 px-8 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_50px_rgba(54,39,28,0.24)] transition hover:-translate-y-0.5 hover:bg-amber-900"
              >
                Start painting
              </button>
            </div>
          </div>
        </section>
      )}

      {step.name === "generating" && <GeneratingStep style={step.style} photoUrl={photoUrl} />}

      {step.name === "result" && resultUrl && (
        <section className="mx-auto max-w-[880px] px-5 pb-24 pt-32 text-center">
          {/* Gallery mount: white matboard + nameplate */}
          <figure className="mx-auto inline-block rounded-[1.8rem] bg-white p-5 pb-7 shadow-[0_36px_120px_rgba(120,72,38,0.26)] ring-1 ring-amber-900/10 sm:p-7 sm:pb-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt={step.style.name} className="max-h-[56vh] rounded-[1rem] ring-1 ring-amber-900/10" />
            <figcaption className="mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-amber-900/25" />
              <span className="text-xs font-black uppercase tracking-[0.24em] text-stone-600">{step.style.name}</span>
              <span className="h-px w-8 bg-amber-900/25" />
            </figcaption>
          </figure>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={unlockHd}
              disabled={unlocking}
              className="rounded-full bg-stone-950 px-8 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_50px_rgba(54,39,28,0.24)] transition hover:-translate-y-0.5 hover:bg-amber-900 disabled:opacity-60"
            >
              {unlocking ? "…" : unlocked ? "Download HD" : "Unlock HD — 1 credit"}
            </button>
            <button
              onClick={() => setStep({ name: "gallery" })}
              className="rounded-full bg-white/75 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-amber-900 ring-1 ring-amber-900/12 backdrop-blur transition hover:bg-white"
            >
              Try another style
            </button>
          </div>
          {!unlocked ? (
            <p className="mx-auto mt-5 max-w-md text-xs font-bold leading-6 text-stone-500">
              The HD original is already painted and saved — grab a credit pack below and unlock it anytime,
              no re-generation needed. Always preview before you pay.
            </p>
          ) : (
            <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-900/60">
                {PARENT_BRAND} — keeping the bond alive.
              </p>
              {emailState !== "done" ? (
                <form onSubmit={subscribe} className="flex w-full gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-bold ring-1 ring-amber-900/15 placeholder:text-stone-400"
                    aria-label="Email address"
                  />
                  <button
                    type="submit"
                    disabled={emailState === "sending"}
                    className="rounded-full bg-stone-950 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                  >
                    {emailState === "sending" ? "…" : "Join"}
                  </button>
                </form>
              ) : (
                <p className="text-sm font-black text-amber-900">You&apos;re on the list — talk soon.</p>
              )}
              <p className="text-center text-xs font-bold leading-5 text-stone-400">
                We&apos;re building more ways to keep their memory close. Leave your email to be the first to know.
              </p>
            </div>
          )}
          {!unlocked && <CreditPacks busyPack={busyPack} onBuy={buyPack} compact />}
        </section>
      )}
    </main>
  );
}

function StyleCard({ style, index, onPick }: { style: PortraitStyle; index: number; onPick: () => void }) {
  const tilt = ["-rotate-1", "rotate-[0.6deg]", "rotate-1", "-rotate-[0.6deg]"][index % 4];
  return (
    <button
      onClick={onPick}
      className={`group ${tilt} rounded-[1.6rem] bg-white p-3 text-left shadow-[0_20px_70px_rgba(120,72,38,0.12)] ring-1 ring-amber-900/8 transition duration-300 hover:rotate-0 hover:!scale-[1.03] hover:shadow-[0_30px_90px_rgba(120,72,38,0.2)]`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[1.1rem]" style={{ background: style.accent }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/styles/${style.id}.jpg`}
          alt={style.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/78 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.14em] text-amber-950 backdrop-blur">
          {String(index + 1).padStart(2, "0")}
        </span>
        {style.occasion && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-700 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-white">
            Occasion
          </span>
        )}
      </div>
      <div className="flex items-center justify-between px-2 pb-1 pt-3">
        <h3 className="text-sm font-black leading-tight tracking-[-0.02em] sm:text-base">{style.name}</h3>
        <span className="text-lg font-black text-amber-900/40 transition group-hover:translate-x-1 group-hover:text-amber-900">
          →
        </span>
      </div>
    </button>
  );
}

function GeneratingStep({ style, photoUrl }: { style: PortraitStyle; photoUrl: string | null }) {
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, PAINTING_STEPS.length - 1)), 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto max-w-[720px] px-5 pb-24 pt-40 text-center">
      <div className="relative mx-auto h-44 w-44">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Your photo"
            className="h-full w-full animate-pulse rounded-[1.4rem] object-cover blur-[2px] shadow-[0_24px_80px_rgba(120,72,38,0.2)]"
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-[1.4rem]" style={{ background: style.accent }} />
        )}
        <span className="absolute -right-2 -top-2 flex h-9 w-9 animate-spin items-center justify-center rounded-full border-[3px] border-amber-200 border-t-amber-900 bg-white/80" />
      </div>
      <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-amber-800/70">{style.name}</p>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">{PAINTING_STEPS[stepIndex]}</h2>
      <p className="mt-4 text-sm font-bold text-stone-500">Usually 30–60 seconds. Keep this page open.</p>
    </section>
  );
}

function CreditPacks({ busyPack, onBuy, compact }: { busyPack: string | null; onBuy: (key: string) => void; compact?: boolean }) {
  return (
    <section className={compact ? "mt-12" : "bg-[#f3dcc4] px-5 py-20 sm:px-9 lg:px-14 lg:py-24"}>
      <div className={compact ? "" : "mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"}>
        {!compact && (
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-amber-900/70">Credits</p>
            <h2 className="text-4xl font-black leading-none tracking-[-0.04em] sm:text-5xl">
              HD portraits, by the pack.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-stone-700">
              One credit paints one full-resolution portrait — no watermark, no subscription, and credits
              never expire.
            </p>
          </div>
        )}
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {PACKS.map((pack) => (
            <div
              key={pack.key}
              className={`rounded-[1.6rem] p-7 text-left shadow-[0_20px_70px_rgba(91,55,30,0.14)] ${
                pack.highlight ? "bg-stone-950 text-white" : "bg-[#fff7ed]/85 ring-1 ring-amber-950/10"
              }`}
            >
              <p className={`text-xs font-black uppercase tracking-[0.22em] ${pack.highlight ? "text-amber-200/80" : "text-amber-900/60"}`}>
                {pack.name}
              </p>
              <p className="mt-3 text-5xl font-black tracking-[-0.05em]">${pack.usd}</p>
              <p className={`mt-2 text-sm font-bold ${pack.highlight ? "text-white/70" : "text-stone-600"}`}>
                {pack.credits} portraits · never expires
              </p>
              <button
                onClick={() => onBuy(pack.key)}
                disabled={busyPack !== null}
                className={`mt-6 w-full rounded-full px-6 py-3 text-xs font-black uppercase tracking-[0.18em] transition hover:-translate-y-0.5 disabled:opacity-60 ${
                  pack.highlight ? "bg-[#fff7ed] text-stone-950" : "bg-stone-950 text-white hover:bg-amber-900"
                }`}
              >
                {busyPack === pack.key ? "…" : `Get ${pack.credits} credits`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ email, emailState, onEmail, onSubscribe }: {
  email: string;
  emailState: "idle" | "sending" | "done";
  onEmail: (v: string) => void;
  onSubscribe: (e: React.FormEvent) => void;
}) {
  return (
    <footer className="bg-stone-950 px-5 py-20 text-white sm:px-9 lg:px-14">
      <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-10 md:flex-row md:items-center">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-amber-200/70">Stay close</p>
          <h2 className="max-w-2xl text-4xl font-black leading-none tracking-[-0.04em] sm:text-6xl">
            New styles land all year.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/62">
            We&apos;re building more ways to keep their memory close. Leave your email to be the first to know.
          </p>
        </div>
        {emailState === "done" ? (
          <p className="text-sm font-black text-amber-200">You&apos;re on the list — talk soon.</p>
        ) : (
          <form className="flex w-full max-w-md gap-2" onSubmit={onSubscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 placeholder:text-white/40"
              aria-label="Email address"
            />
            <button
              type="submit"
              disabled={emailState === "sending"}
              className="rounded-full bg-[#fff7ed] px-7 py-3 text-xs font-black uppercase tracking-[0.18em] text-stone-950 disabled:opacity-60"
            >
              {emailState === "sending" ? "…" : "Join"}
            </button>
          </form>
        )}
      </div>
      <p className="mx-auto mt-14 max-w-[1320px] border-t border-white/10 pt-8 text-xs font-bold text-white/40">
        by {PARENT_BRAND}
      </p>
    </footer>
  );
}
