// Round 2 (founder request): nano-banana vs seedream-4.5 (latest, no v5
// exists) vs gpt-image-2, each running ALL 11 live homepage styles on the
// same face-visible Pomeranian. Output: one 12-tile grid per engine.
// Usage: node scripts/engine-shootout-v2.mjs <input-image>
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

const OUT_DIR = "测试对比/引擎横评2";

const tsSource = readFileSync("src/lib/styles.ts", "utf8");
const KEEP = tsSource.match(/const KEEP =\s*\n?\s*"([^"]+)"/)[1];
const allStyles = [...tsSource.matchAll(/id: "([a-z-]+)",\s*\n\s*name: "([^"]+)",\s*\n\s*prompt: `([^`]+)`/g)].map(
  (m) => ({ id: m[1], name: m[2], prompt: m[3].replaceAll("${KEEP}", KEEP).replace(/\$\{KEEP\.replace\([^}]+\)\}/, KEEP.replace("Do not change the animal's breed, proportions or pose.", "Keep the same pose.")) })
);
const styles = allStyles.filter((s) => s.id !== "superhero-comic"); // 11 live styles

const ENGINES = [
  {
    key: "nano-banana",
    label: "Nano Banana",
    model: "google/nano-banana",
    input: (dataUrl, prompt) => ({ image_input: [dataUrl], prompt, output_format: "jpg" }),
  },
  {
    key: "seedream-4.5",
    label: "Seedream 4.5",
    model: "bytedance/seedream-4.5",
    input: (dataUrl, prompt) => ({ image_input: [dataUrl], prompt }),
  },
  {
    key: "gpt-image-2",
    label: "GPT Image 2",
    model: "openai/gpt-image-2",
    input: (dataUrl, prompt) => ({ input_images: [dataUrl], prompt, quality: "medium", output_format: "jpeg" }),
  },
];

const token = readFileSync(".env.local", "utf8").match(/REPLICATE_API_TOKEN=(.+)/)[1].trim();
const replicate = new Replicate({ auth: token });

async function runWithRetry(model, input) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await replicate.run(model, { input });
    } catch (err) {
      const s = String(err);
      if ((s.includes("429") || s.includes("fetch failed")) && attempt < 8) {
        process.stdout.write("(重试) ");
        await new Promise((r) => setTimeout(r, 15000));
        continue;
      }
      throw err;
    }
  }
}

async function toBuffer(output) {
  const first = Array.isArray(output) ? output[0] : output;
  if (typeof first === "string") {
    const res = await fetch(first);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first && typeof first.url === "function") {
    const res = await fetch(first.url());
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unrecognized output: " + JSON.stringify(output).slice(0, 150));
}

const inputPath = process.argv[2];
const onlyEngine = process.argv[3]; // optional: run a single engine
const activeEngines = onlyEngine ? ENGINES.filter((e) => e.key === onlyEngine) : ENGINES;
mkdirSync(OUT_DIR, { recursive: true });
const dataUrl = `data:image/jpeg;base64,${readFileSync(inputPath).toString("base64")}`;

const TILE = 440;
async function tile(p, label) {
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="40"><rect width="${TILE}" height="40" fill="black" fill-opacity="0.65"/><text x="8" y="27" font-size="18" font-family="Arial" font-weight="bold" fill="white">${label}</text></svg>`;
  const buf = await sharp(p).resize({ width: TILE, height: TILE, fit: "cover" }).toBuffer();
  return sharp(buf).composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();
}

for (const e of activeEngines) {
  console.log(`\n=== ${e.key} ===`);
  const tiles = [await tile(inputPath, "原图")];
  for (const s of styles) {
    process.stdout.write(`${s.id} ... `);
    try {
      const out = await runWithRetry(e.model, e.input(dataUrl, s.prompt));
      const buf = await toBuffer(out);
      const outPath = `${OUT_DIR}/${e.key}--${s.id}.jpg`;
      await sharp(buf).jpeg({ quality: 92 }).toFile(outPath);
      console.log("OK");
      tiles.push(await tile(outPath, s.name));
    } catch (err) {
      console.log("FAILED:", String(err).slice(0, 130));
    }
  }
  const cols = 3, GAP = 5, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * TILE + (cols - 1) * GAP, height: rows * TILE + (rows - 1) * GAP, channels: 3, background: { r: 18, g: 18, b: 18 } } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (TILE + GAP), top: Math.floor(i / cols) * (TILE + GAP) })))
    .jpeg({ quality: 88 })
    .toFile(`${OUT_DIR}/${e.key}-全11风格.jpg`);
  console.log(`grid -> ${OUT_DIR}/${e.key}-全11风格.jpg`);
}
