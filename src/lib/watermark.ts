import sharp from "sharp";
import { WATERMARK_TILE_B64 } from "./watermarkTile";

// 512px per the credit-model spec: free tier gets a 512px watermarked preview.
const PREVIEW_MAX_WIDTH = 512;

/**
 * Tiled watermark covering the whole preview — the free preview must be
 * clearly marked or a screenshot replaces the purchase.
 *
 * The mark is a pre-rendered PNG tile (see watermarkTile.ts), NOT SVG
 * text: Vercel's serverless runtime has no system fonts, so SVG <text>
 * silently renders blank there — which is exactly how the first version
 * shipped with an invisible watermark while looking fine locally.
 */
export async function makeWatermarkedPreview(input: Buffer): Promise<Buffer> {
  const { data: resized, info } = await sharp(input)
    .rotate()
    .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  // sharp's tiled composite requires the tile to be no larger than the
  // image — shrink it to fit small previews (the 560px tile vs the 512px
  // preview crashed generation in production).
  let tile = Buffer.from(WATERMARK_TILE_B64, "base64");
  const tileMeta = await sharp(tile).metadata();
  const maxW = Math.min(tileMeta.width ?? 1, Math.floor(info.width * 0.9));
  const maxH = Math.min(tileMeta.height ?? 1, Math.floor(info.height * 0.9));
  if ((tileMeta.width ?? 0) > maxW || (tileMeta.height ?? 0) > maxH) {
    tile = await sharp(tile).resize({ width: maxW, height: maxH, fit: "inside" }).png().toBuffer();
  }

  return sharp(resized)
    .composite([{ input: tile, tile: true, blend: "over" }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
