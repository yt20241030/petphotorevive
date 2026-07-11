import sharp from "sharp";
import { WATERMARK_TILE_B64 } from "./watermarkTile";

// 512px per the credit-model spec: free tier gets a 512px watermarked preview.
const PREVIEW_MAX_WIDTH = 512;

/**
 * Tiled watermark covering the whole preview — the free preview must be
 * clearly marked or a screenshot replaces the $9 purchase.
 *
 * The mark is a pre-rendered PNG tile (see watermarkTile.ts), NOT SVG
 * text: Vercel's serverless runtime has no system fonts, so SVG <text>
 * silently renders blank there — which is exactly how the first version
 * shipped with an invisible watermark while looking fine locally.
 */
export async function makeWatermarkedPreview(input: Buffer): Promise<Buffer> {
  const resized = await sharp(input)
    .rotate()
    .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
    .toBuffer();

  return sharp(resized)
    .composite([{ input: Buffer.from(WATERMARK_TILE_B64, "base64"), tile: true, blend: "over" }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
