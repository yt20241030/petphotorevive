// One-off generator for the landing-page hero's before/after demo images.
// Self-authored placeholder art (no external photos) run through the
// sharp-basic engine, so the "after" is a real sample of what that engine
// actually produces. Re-run any time watermark.ts/sharpBasic.ts changes.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const SIZE = 520;

const petSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#f3e3c8"/>
      <stop offset="100%" stop-color="#d8b98c"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <g fill="#6b4a34" opacity="0.9">
    <ellipse cx="260" cy="300" rx="120" ry="100"/>
    <circle cx="185" cy="180" r="55"/>
    <circle cx="335" cy="180" r="55"/>
    <ellipse cx="260" cy="245" rx="70" ry="60" fill="#8a6448"/>
  </g>
  <g fill="#3a2a1e">
    <circle cx="225" cy="235" r="10"/>
    <circle cx="295" cy="235" r="10"/>
    <ellipse cx="260" cy="270" rx="14" ry="10"/>
  </g>
  <path d="M260 280 Q260 300 240 300" stroke="#3a2a1e" stroke-width="6" fill="none" stroke-linecap="round"/>
</svg>`;

async function main() {
  await mkdir("public/demo", { recursive: true });

  const clean = await sharp(Buffer.from(petSvg)).jpeg({ quality: 95 }).toBuffer();

  // "Before": simulate a faded, soft old print.
  const before = await sharp(clean)
    .blur(4)
    .modulate({ saturation: 0.55, brightness: 0.92 })
    .jpeg({ quality: 55 })
    .toBuffer();

  // "After": same steps as src/lib/engine/sharpBasic.ts (plain node can't
  // import that .ts file directly), then fit back to SIZE so the slider
  // compares two same-dimension images.
  const afterFull = await sharp(before)
    .resize({ width: SIZE * 2, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.2 })
    .modulate({ saturation: 1.05 })
    .jpeg({ quality: 92 })
    .toBuffer();
  const after = await sharp(afterFull).resize({ width: SIZE }).jpeg({ quality: 90 }).toBuffer();

  await writeFile("public/demo/before.jpg", before);
  await writeFile("public/demo/after.jpg", after);
  console.log("Wrote public/demo/before.jpg and public/demo/after.jpg");
}

main();
