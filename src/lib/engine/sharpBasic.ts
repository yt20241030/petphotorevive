import sharp from "sharp";
import type { RestoreEngine, RestoreResult } from "./types";

/**
 * Temporary, key-free "restoration": upscale 2x with a quality resample
 * filter + light sharpening so old photos visibly look crisper. Stand-in
 * for the real Real-ESRGAN engine until REPLICATE_API_TOKEN is available.
 */
export const sharpBasicEngine: RestoreEngine = {
  name: "sharp-basic",
  async restore(input: Buffer): Promise<RestoreResult> {
    const image = sharp(input).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? 1024;

    const buffer = await image
      .resize({ width: width * 2, kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 1.2 })
      .modulate({ saturation: 1.05 })
      .jpeg({ quality: 92 })
      .toBuffer();

    return { engine: "sharp-basic", buffer };
  },
};
