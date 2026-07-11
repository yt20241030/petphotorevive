import { NextRequest, NextResponse } from "next/server";
import { getStyle } from "@/lib/styles";
import { stylizePhoto } from "@/lib/engine/stylize";
import { makeWatermarkedPreview } from "@/lib/watermark";
import { createJob, markPaid } from "@/lib/jobStore";
import { checkAndConsumeFreeUpload } from "@/lib/rateLimit";
import { hasDailyCapacity, recordRestoreCall } from "@/lib/dailyCap";
import { checkPetFace, FACE_GATE_MESSAGE } from "@/lib/faceGate";
import { consumeFreeTry, getUser, isValidAnonId, spendCredits, FREE_TRIES } from "@/lib/userStore";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("photo");
  const styleId = form.get("styleId");
  const anonId = form.get("anonId");

  if (!(file instanceof File)) return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type))
    return NextResponse.json({ error: "Only JPG, PNG or WEBP photos are supported." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo is too large (max 10MB)." }, { status: 400 });
  if (!isValidAnonId(anonId)) return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  const style = getStyle(String(styleId));
  if (!style) return NextResponse.json({ error: "Unknown style." }, { status: 400 });

  // Per-IP daily backstop against scripted abuse (the anon quota is the
  // primary limit — this only blunts someone minting fresh anonIds).
  const { allowed } = checkAndConsumeFreeUpload(clientIp(req));
  if (!allowed) {
    return NextResponse.json({ error: "Daily limit reached — please come back tomorrow." }, { status: 429 });
  }

  if (!(await hasDailyCapacity())) {
    return NextResponse.json(
      { error: "Our studio is at capacity today — please come back tomorrow." },
      { status: 503 }
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  // 🔴 Safety gate BEFORE any quota or spend: no clear pet face → no
  // generation, nothing consumed. We never guess.
  try {
    const gate = await checkPetFace(input);
    if (!gate.ok) {
      return NextResponse.json({ error: FACE_GATE_MESSAGE, gate: gate.reason }, { status: 422 });
    }
  } catch (err) {
    console.error("face gate failed", err);
    return NextResponse.json(
      { error: "We couldn't check the photo right now — please try again." },
      { status: 502 }
    );
  }

  // Quota: free tier (watermarked 512px preview) or 1 credit (HD unlocked).
  const user = await getUser(anonId);
  const useCredit = user.freeUsed >= FREE_TRIES;
  if (useCredit && user.credits < 1) {
    return NextResponse.json(
      { error: "You've used your free tries. Get a credit pack to keep creating.", needCredits: true },
      { status: 402 }
    );
  }

  try {
    const hdBuffer = await stylizePhoto(input, style.prompt);
    await recordRestoreCall();
    const previewBuffer = await makeWatermarkedPreview(hdBuffer);

    const job = await createJob({
      contentHash: `${anonId}-${Date.now()}`, // stylized output is per-request; no dedup cache
      engine: `kontext-style:${style.id}`,
      cleanBuffer: hdBuffer,
      previewBuffer,
    });

    // Consume quota only AFTER successful generation — a failed run must
    // never charge the user.
    let updated;
    if (useCredit) {
      updated = await spendCredits(anonId, 1);
      await markPaid(job.id); // credit generation = HD already unlocked
    } else {
      updated = await consumeFreeTry(anonId);
    }

    return NextResponse.json({
      jobId: job.id,
      styleId: style.id,
      unlocked: useCredit,
      freeLeft: Math.max(0, FREE_TRIES - (updated?.freeUsed ?? user.freeUsed)),
      credits: updated?.credits ?? user.credits,
      previewDataUrl: `data:image/jpeg;base64,${previewBuffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("generate failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed — you were not charged." },
      { status: 502 }
    );
  }
}
