import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBlobToken } from "@/lib/blobToken";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const globalStore = globalThis as unknown as { __petphotorevive_emails?: string[] };

/** Post-purchase email capture. Stored in Vercel Blob under emails/. */
export async function POST(req: NextRequest) {
  const { email, jobId } = (await req.json().catch(() => ({}))) as { email?: string; jobId?: string };
  const cleaned = email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(cleaned) || cleaned.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const record = { email: cleaned, jobId: jobId ?? null, at: new Date().toISOString() };

  if (getBlobToken()) {
    const { put } = await import("@vercel/blob");
    // Hash-keyed path so the same email resubscribing just overwrites
    // itself instead of piling up duplicates.
    const key = crypto.createHash("sha256").update(cleaned).digest("hex").slice(0, 32);
    await put(`emails/${key}.json`, JSON.stringify(record), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: getBlobToken(),
    });
  } else {
    const list = (globalStore.__petphotorevive_emails ??= []);
    if (!list.includes(cleaned)) list.push(cleaned);
  }

  return NextResponse.json({ ok: true });
}
