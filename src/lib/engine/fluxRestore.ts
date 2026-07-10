import sharp from "sharp";
import type { RestoreEngine, RestoreResult } from "./types";

/**
 * Primary engine (founder decision 2026-07-10): flux-kontext-apps/
 * restore-image does the actual restoration (de-fade, de-scratch,
 * colorize; ~$0.04), then Real-ESRGAN x2 (face_enhance=false, BSD)
 * upscales its ~1MP output to HD (~$0.004). Fixed seed so the same photo
 * restores the same way on re-runs.
 */
export const fluxRestoreEngine: RestoreEngine = {
  name: "flux-restore",
  async restore(input: Buffer): Promise<RestoreResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }

    const Replicate = (await import("replicate")).default;
    const replicate = new Replicate({ auth: token });

    const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;

    const restored = await replicate.run("flux-kontext-apps/restore-image", {
      input: { input_image: dataUrl, seed: 7, output_format: "jpg" },
    });
    const restoredBuf = await outputToBuffer(restored);

    const upscaled = await replicate.run("nightmareai/real-esrgan", {
      input: {
        image: `data:image/jpeg;base64,${restoredBuf.toString("base64")}`,
        scale: 2,
        face_enhance: false,
      },
    });
    const upscaledBuf = await outputToBuffer(upscaled);

    const buffer = await sharp(upscaledBuf).jpeg({ quality: 95 }).toBuffer();
    return { engine: "flux-restore", buffer };
  },
};

async function outputToBuffer(output: unknown): Promise<Buffer> {
  const first = Array.isArray(output) ? output[0] : output;
  if (typeof first === "string") {
    const res = await fetch(first);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first && typeof (first as { url?: unknown }).url === "function") {
    const res = await fetch((first as { url: () => string }).url());
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unrecognized Replicate output shape");
}
