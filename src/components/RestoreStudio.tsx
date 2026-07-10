"use client";

import { useRef, useState } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { PRICE_USD } from "@/lib/brand";

type Stage = "idle" | "uploading" | "ready" | "paying" | "paid";

export function RestoreStudio() {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setStage("uploading");
    setOriginalUrl(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/restore", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong, please try again.");
      setPreviewUrl(data.previewDataUrl);
      setJobId(data.jobId);
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

  function reset() {
    setStage("idle");
    setOriginalUrl(null);
    setPreviewUrl(null);
    setJobId(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="w-full max-w-xl">
      {stage === "idle" || stage === "uploading" ? (
        <label
          className="flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-white/60 p-8 text-center transition hover:border-amber-500 hover:bg-white"
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
            disabled={stage === "uploading"}
          />
          {stage === "uploading" ? (
            <span className="text-amber-800">Restoring your photo…</span>
          ) : (
            <>
              <span className="text-lg font-medium text-zinc-700">Upload your pet&apos;s old photo</span>
              <span className="text-sm text-zinc-500">JPG, PNG or WEBP · up to 10MB</span>
            </>
          )}
        </label>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {originalUrl && previewUrl && (
            <BeforeAfterSlider beforeSrc={originalUrl} afterSrc={previewUrl} beforeLabel="Original" afterLabel="Preview" />
          )}
          <p className="text-center text-sm text-zinc-500">
            Preview is watermarked and lower-resolution. The clean high-resolution photo unlocks after payment.
          </p>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <button
              onClick={handleDownload}
              disabled={stage === "paying"}
              className="rounded-full bg-amber-800 px-6 py-3 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-60"
            >
              {stage === "paying" ? "Processing…" : `Download HD (no watermark) — $${PRICE_USD}`}
            </button>
            <button onClick={reset} className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700">
              Start over
            </button>
          </div>
          {stage === "paid" && (
            <p className="text-sm font-medium text-emerald-700">
              Your download has started. Thank you! ({"Payments are in test mode while we finish setup."})
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
