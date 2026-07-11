// Strategic experiment: can Flux Kontext produce "memorial-grade art
// portraits" (not just restoration) while preserving the pet's likeness?
// Runs the same photo through 3 art styles via black-forest-labs/
// flux-kontext-pro (official commercial API, ~$0.04/image).
// Usage: node scripts/portrait-styles.mjs <input-image>
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

const OUT_DIR = "测试对比/艺术肖像实验";

// Likeness first: every prompt hammers on preserving the exact animal.
const STYLES = [
  {
    key: "watercolor",
    label: "水彩 Watercolor",
    prompt:
      "Transform this photo into a delicate watercolor painting portrait of this exact dog. Preserve its precise fur colors, markings, face shape, eye color and expression — it must be unmistakably the same individual dog. Soft translucent watercolor washes, subtle paper texture, gentle color bleeding at the edges, plain light background. Elegant, gallery-quality, suitable for framing as a memorial portrait.",
  },
  {
    key: "oil",
    label: "油画 Oil painting",
    prompt:
      "Transform this photo into a classical oil painting portrait of this exact dog. Preserve its precise fur colors, markings, face shape, eye color and expression — it must be unmistakably the same individual dog. Rich visible brushstrokes, warm rembrandt-style lighting, deep muted background, canvas texture. Dignified, timeless, gallery-quality, suitable for framing as a memorial portrait.",
  },
  {
    key: "charcoal",
    label: "炭笔 Charcoal sketch",
    prompt:
      "Transform this photo into a fine charcoal sketch portrait of this exact dog. Preserve its precise markings, face shape and expression — it must be unmistakably the same individual dog. Expressive charcoal strokes, careful shading, black and white on textured drawing paper, plain background. Hand-drawn artistic quality, suitable for framing as a memorial portrait.",
  },
];

const token = readFileSync(".env.local", "utf8").match(/REPLICATE_API_TOKEN=(.+)/)[1].trim();
const replicate = new Replicate({ auth: token });

async function runWithRetry(model, input) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await replicate.run(model, { input });
    } catch (err) {
      if (String(err).includes("429") && attempt < 8) {
        process.stdout.write("(限速,等15s) ");
        await new Promise((r) => setTimeout(r, 15000));
        continue;
      }
      throw err;
    }
  }
}

async function toBuffer(output) {
  const url = Array.isArray(output) ? output[0] : output;
  const res = await fetch(typeof url === "string" ? url : url.url());
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/portrait-styles.mjs <input-image>");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const dataUrl = `data:image/jpeg;base64,${readFileSync(inputPath).toString("base64")}`;

  for (const s of STYLES) {
    process.stdout.write(`${s.key} ... `);
    try {
      const out = await runWithRetry("black-forest-labs/flux-kontext-pro", {
        input_image: dataUrl,
        prompt: s.prompt,
        output_format: "jpg",
      });
      const buf = await toBuffer(out);
      await sharp(buf).jpeg({ quality: 95 }).toFile(`${OUT_DIR}/${s.key}.jpg`);
      const m = await sharp(`${OUT_DIR}/${s.key}.jpg`).metadata();
      console.log(`OK ${m.width}x${m.height}`);
    } catch (err) {
      console.log("FAILED:", String(err).slice(0, 150));
    }
  }

  // Original + 3 styles in one grid for the likeness judgment.
  const TILE = 620;
  const entries = [
    [inputPath, "原图"],
    [`${OUT_DIR}/watercolor.jpg`, "水彩"],
    [`${OUT_DIR}/oil.jpg`, "油画"],
    [`${OUT_DIR}/charcoal.jpg`, "炭笔素描"],
  ];
  const tiles = [];
  for (const [p, label] of entries) {
    try {
      const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="44"><rect width="${TILE}" height="44" fill="black" fill-opacity="0.65"/><text x="10" y="30" font-size="22" font-family="Arial" font-weight="bold" fill="white">${label}</text></svg>`;
      const buf = await sharp(p)
        .resize({ width: TILE, height: TILE, fit: "contain", background: { r: 20, g: 20, b: 20 } })
        .toBuffer();
      tiles.push(await sharp(buf).composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }]).jpeg({ quality: 92 }).toBuffer());
    } catch {
      /* skip missing */
    }
  }
  const cols = 2, GAP = 6, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * TILE + GAP, height: rows * TILE + (rows - 1) * GAP, channels: 3, background: { r: 20, g: 20, b: 20 } } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (TILE + GAP), top: Math.floor(i / cols) * (TILE + GAP) })))
    .jpeg({ quality: 90 })
    .toFile(`${OUT_DIR}/总对比.jpg`);
  console.log(`grid -> ${OUT_DIR}/总对比.jpg`);
}

main();
