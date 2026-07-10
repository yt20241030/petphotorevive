import { NextRequest, NextResponse } from "next/server";
import { getRestoreEngine } from "@/lib/engine";
import { makeWatermarkedPreview } from "@/lib/watermark";
import { createJob, findJobByHash, getPreviewBuffer, hashContent } from "@/lib/jobStore";
import { checkAndConsumeFreeUpload } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60; // real-esrgan inference can take longer than the 10s default

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WEBP photos are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 10MB)." }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  const contentHash = hashContent(input);

  const cached = await findJobByHash(contentHash);
  if (cached) {
    const previewBuffer = await getPreviewBuffer(cached.id);
    if (previewBuffer) {
      return NextResponse.json({
        jobId: cached.id,
        engine: cached.engine,
        previewDataUrl: `data:image/jpeg;base64,${previewBuffer.toString("base64")}`,
      });
    }
  }

  const ip = clientIp(req);
  const { allowed, remaining } = checkAndConsumeFreeUpload(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily free preview limit reached. Please try again tomorrow." },
      { status: 429 }
    );
  }

  const engine = getRestoreEngine();
  try {
    const { buffer: cleanBuffer } = await engine.restore(input);
    const previewBuffer = await makeWatermarkedPreview(cleanBuffer);

    const job = await createJob({ contentHash, engine: engine.name, cleanBuffer, previewBuffer });

    return NextResponse.json({
      jobId: job.id,
      engine: engine.name,
      remainingFreePreviews: remaining,
      previewDataUrl: `data:image/jpeg;base64,${previewBuffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("restore failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restoration failed, please try again." },
      { status: 502 }
    );
  }
}
