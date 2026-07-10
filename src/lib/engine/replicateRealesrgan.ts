import sharp from "sharp";
import type { RestoreEngine, RestoreResult } from "./types";

/**
 * Backup "enhance-only, no re-rendering" engine — Replicate
 * nightmareai/real-esrgan, face_enhance=false (BSD, commercial-safe;
 * face_enhance pulls in non-commercial GFPGAN/DFDNet, never enable it).
 * x4 + light sharpen per the 2026-07-10 shootout (x2 was too conservative).
 * Activated via RESTORE_ENGINE=realesrgan.
 */
export const replicateRealesrganEngine: RestoreEngine = {
  name: "replicate-realesrgan",
  async restore(input: Buffer): Promise<RestoreResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }

    const Replicate = (await import("replicate")).default;
    const replicate = new Replicate({ auth: token });

    const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;

    // Unpinned "owner/model" form (no ":version" hash) — Replicate resolves
    // it to that model's current latest version server-side. Avoids baking
    // in a version hash from memory that can go stale/invalid over time.
    const output = await replicate.run("nightmareai/real-esrgan", {
      input: {
        image: dataUrl,
        scale: 4,
        face_enhance: false,
      },
    });

    const url = Array.isArray(output) ? output[0] : (output as unknown as string);
    const res = await fetch(url as string);
    const raw = Buffer.from(await res.arrayBuffer());
    const buffer = await sharp(raw).sharpen({ sigma: 1.0 }).jpeg({ quality: 95 }).toBuffer();

    return { engine: "replicate-realesrgan", buffer };
  },
};
