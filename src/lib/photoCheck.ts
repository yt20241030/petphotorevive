import sharp from "sharp";

export interface PhotoFlags {
  heavilyBlurred: boolean;
  overexposed: boolean;
}

/**
 * Cheap local heuristics (no model call) for the gentle "results may vary"
 * notice. Advisory only — never blocks the upload. Thresholds are set
 * conservative so only clearly-bad photos trigger; old-photo grain and
 * mild softness must NOT trip them.
 */
export async function analyzePhoto(input: Buffer): Promise<PhotoFlags> {
  const { data, info } = await sharp(input)
    .rotate()
    .greyscale()
    .resize({ width: 400, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Focus measure: variance of the Laplacian. Blurry images have weak
  // second-derivative response everywhere.
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  const lapVariance = sumSq / n - mean * mean;

  // Exposure: fraction of near-white pixels plus overall brightness.
  let bright = 0;
  let clipped = 0;
  for (let i = 0; i < data.length; i++) {
    bright += data[i];
    if (data[i] >= 250) clipped++;
  }
  const avgBrightness = bright / data.length;
  const clippedFrac = clipped / data.length;

  return {
    heavilyBlurred: lapVariance < 40,
    overexposed: avgBrightness > 225 || clippedFrac > 0.4,
  };
}
