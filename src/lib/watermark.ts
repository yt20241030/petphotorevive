import sharp from "sharp";
import { BRAND_NAME, PARENT_BRAND } from "./brand";

const PREVIEW_MAX_WIDTH = 800;

/**
 * Diagonal tiled watermark covering the whole image — the free preview must
 * be clearly marked or a screenshot replaces the $9 purchase. White fill
 * with a dark stroke keeps it visible on both light and dark photos;
 * opacity is tuned so the restoration quality still reads through.
 */
function watermarkSvg(width: number, height: number) {
  const text = `${BRAND_NAME} · by ${PARENT_BRAND}`;
  const tileW = 340;
  const tileH = 150;
  const cols = Math.ceil(width / tileW) + 2;
  const rows = Math.ceil(height / tileH) + 2;
  let marks = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * tileW - (r % 2 === 0 ? 0 : tileW / 2);
      const y = r * tileH;
      marks += `<text x="${x}" y="${y}" transform="rotate(-30 ${x} ${y})" font-size="30" font-weight="600" font-family="sans-serif" fill="white" fill-opacity="0.45" stroke="black" stroke-opacity="0.35" stroke-width="1.2">${text}</text>`;
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
