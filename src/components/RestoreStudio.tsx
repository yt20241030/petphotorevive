"use client";

import { useEffect, useRef, useState } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { PARENT_BRAND, PRICE_USD } from "@/lib/brand";

export type StudioStage = "idle" | "uploading" | "ready" | "paying" | "paid";

interface PhotoFlags {
  heavilyBlurred?: boolean;
  overexposed?: boolean;
}

export function RestoreStudio({ onStageChange }: { onStageChange?: (stage: StudioStage) => void }) {
  const [stage, setStage] = useState<StudioStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | undefined>(undefined);
  const [jobId, setJobId] = useState<string | null>(null);
  const [flags, setFlags] = useState<PhotoFlags>({});
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  async function handleFile(file: File) {
    setError(null);
    setStage("uploading");
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    // Match the result frame to the photo's own aspect so nothing is cropped.
    const probe = new Image();
    probe.onload = () => setAspectRatio(`${probe.naturalWidth} / ${probe.naturalHeight}`);
    probe.src = url;

    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/restore", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong, please try again.");
      setPreviewUrl(data.previewDataUrl);
      setJobId(data.jobId);
      setFlags(data.photoFlags ?? {});
      setStage("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStage("idle");
    }
  }

  async function handleDownload() {
    if (!jobId) return;
    setError(null);
    setStage("paying");
    try {
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error ?? "Payment failed.");

      const linkRes = await fetch(`/api/download-link?jobId=${jobId}`);
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error ?? "Could not prepare download.");

      const a = document.createElement("a");
      a.href = linkData.url;
      a.click();
      setStage("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
      setStage("ready");
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setEmailState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, jobId }),
      });
      if (!res.ok) throw new Error();
      setEmailState("done");
    } catch {
      setEmailState("error");
    }
  }

  function reset() {
    setStage("idle");
    setOriginalUrl(null);
    setPreviewUrl(null);
    setAspectRatio(undefined);
    setJobId(null);
    setFlags({});
    setError(null);
    setEmail("");
    setEmailState("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const qualityNotice = flags.heavilyBlurred
    ? "This photo is heavily blurred — results may vary. Your free preview will show you exactly what to expect."
    : flags.overexposed
      ? "This photo is very overexposed — results may vary. Your free preview will show you exactly what to expect."
      : null;

  if (stage === "idle") {
    return (
      <div className="flex flex-col gap-3">
        <label
          className="flex min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-white/70 p-8 text-center transition hover:border-amber-500 hover:bg-white"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <span className="text-xl font-semibold text-zinc-700">Upload your pet&apos;s old photo</span>
          <span className="text-sm text-zinc-500">JPG, PNG or WEBP · up to 10MB</span>
          <span className="mt-2 rounded-full bg-amber-800 px-6 py-2.5 text-sm font-medium text-white">
            Choose a photo
          </span>
          <span className="text-xs text-zinc-400">Takes about 30–60 seconds · Your preview is free</span>
        </label>
        <p className="text-center text-sm text-zinc-500">
          Not sure? Just try — you&apos;ll see your free preview first, and only pay if you love it.
        </p>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // uploading / ready / paying / paid — the user's photo is the hero now.
  return (
    <div className="flex w-full flex-col items-center gap-5">
      {stage === "uploading" && originalUrl && (
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-amber-200 bg-amber-100 shadow-sm"
          style={aspectRatio ? { aspectRatio } : { aspectRatio: "4 / 3" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={originalUrl}
            alt="Your photo, being restored"
            className="absolute inset-0 h-full w-full scale-105 object-cover blur-md brightness-95"
            draggable={false}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/25 px-6 text-center">
            <span
              aria-hidden
              className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white"
            />
            <p className="text-lg font-medium text-white drop-shadow">Restoring your photo…</p>
            <p className="text-sm text-white/85 drop-shadow">This usually takes 30–60 seconds.</p>
          </div>
        </div>
      )}

      {stage !== "uploading" && originalUrl && previewUrl && (
        <>
          {qualityNotice && (
            <p className="w-full rounded-xl bg-amber-100 px-4 py-3 text-center text-sm text-amber-900">
              {qualityNotice}
            </p>
          )}
          <BeforeAfterSlider
            beforeSrc={originalUrl}
            afterSrc={previewUrl}
            beforeLabel="Original"
            afterLabel="Preview"
            aspectRatio={aspectRatio ?? "1 / 1"}
          />
          <p className="text-center text-sm text-zinc-500">
            Preview is watermarked and lower-resolution. The clean high-resolution photo unlocks after payment.
          </p>
        </>
      )}

      {(stage === "ready" || stage === "paying") && (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <button
            onClick={handleDownload}
            disabled={stage === "paying"}
            className="rounded-full bg-amber-800 px-7 py-3.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-60"
          >
            {stage === "paying" ? "Processing…" : `Download HD (no watermark) — $${PRICE_USD}`}
          </button>
          <button onClick={reset} className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700">
            Start over
          </button>
        </div>
      )}

      {stage === "paid" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl bg-white/80 p-6">
          <p className="text-sm font-medium text-emerald-700">
            Your download has started. Thank you for trusting us with their memory.
          </p>
          <p className="text-xs text-zinc-400">{PARENT_BRAND} — keeping the bond alive.</p>
          {emailState !== "done" ? (
            <form onSubmit={handleSubscribe} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-zinc-700 outline-none focus:border-amber-500"
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={emailState === "sending"}
                className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-60"
              >
                {emailState === "sending" ? "…" : "Keep me posted"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-zinc-500">Thank you — we&apos;ll be in touch.</p>
          )}
          {emailState !== "done" && (
            <p className="max-w-sm text-center text-xs text-zinc-400">
              We&apos;re building more ways to keep their memory close. Leave your email to be the first to know.
            </p>
          )}
          {emailState === "error" && <p className="text-xs text-red-600">Please enter a valid email address.</p>}
          <button onClick={reset} className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600">
            Restore another photo
          </button>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
