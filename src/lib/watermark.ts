import sharp from "sharp";
import { BRAND_NAME } from "./brand";

const PREVIEW_MAX_WIDTH = 800;

function watermarkSvg(width: number, height: number) {
  const tile = 220;
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;
  let marks = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tile;
      const y = r * tile + (c % 2 === 0 ? 0 : tile / 2);
      marks += `<text x="${x}" y="${y}" transform="rotate(-28 ${x} ${y})" font-size="22" font-family="sans-serif" fill="white" fill-opacity="0.35">${BRAND_NAME}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${marks}</svg>`;
}

/** Downscaled + watermarked preview — the only version ever sent before payment. */
export async function makeWatermarkedPreview(input: Buffer): Promise<Buffer> {
  // Resolve the resize first so we know its *actual* output dimensions —
  // metadata() on a pipeline with a queued resize is not reliably the
  // post-resize size, and compositing a mis-sized watermark buffer throws.
  const { data: resized, info } = await sharp(input)
    .rotate()
    .resize({ width: PREVIEW_MAX_WIDTH, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  return sharp(resized)
    .composite([{ input: Buffer.from(watermarkSvg(info.width, info.height)), top: 0, left: 0 }])
    .jpeg({ quality: 82 })
    .toBuffer();
}
