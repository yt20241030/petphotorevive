// Multi-engine shootout on identical stylization tasks (founder request
// 2026-07-11): can another commercial image-edit model hold fur-color
// fidelity where flux-kontext-pro fails (oil/christmas invent tan patches)?
// All candidates are Replicate-hosted commercial APIs. Note for the report:
// seedream-4 is ByteDance — commercially licensed via Replicate (distinct
// from the banned no-commercial-license Doubao API), founder to decide.
// Usage: node scripts/engine-shootout.mjs <input-image>
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

const OUT_DIR = "测试对比/引擎横评";

const tsSource = readFileSync("src/lib/styles.ts", "utf8");
const KEEP = tsSource.match(/const KEEP =\s*\n?\s*"([^"]+)"/)[1];
const allStyles = [...tsSource.matchAll(/id: "([a-z-]+)",\s*\n\s*name: "([^"]+)",\s*\n\s*prompt: `([^`]+)`/g)].map(
  (m) => ({ id: m[1], name: m[2], prompt: m[3].replaceAll("${KEEP}", KEEP) })
);
const STYLE_IDS = ["classic-oil", "christmas-card", "watercolor"];
const styles = allStyles.filter((s) => STYLE_IDS.includes(s.id));

const ENGINES = [
  {
    key: "kontext-pro",
    label: "Kontext Pro (现役)",
    model: "black-forest-labs/flux-kontext-pro",
    input: (dataUrl, prompt) => ({ input_image: dataUrl, prompt, output_format: "jpg" }),
  },
  {
    key: "kontext-max",
    label: "Kontext Max",
    model: "black-forest-labs/flux-kontext-max",
    input: (dataUrl, prompt) => ({ input_image: dataUrl, prompt, output_format: "jpg" }),
  },
  {
    key: "nano-banana",
    label: "Google Nano Banana",
    model: "google/nano-banana",
    input: (dataUrl, prompt) => ({ image_input: [dataUrl], prompt, output_format: "jpg" }),
  },
  {
    key: "qwen-image-edit",
    label: "Qwen Image Edit",
    model: "qwen/qwen-image-edit",
    input: (dataUrl, prompt) => ({ image: dataUrl, prompt, output_format: "jpg" }),
  },
  {
    key: "seedream-4",
    label: "Seedream 4 (字节,商用API,待拍板)",
    model: "bytedance/seedream-4",
    input: (dataUrl, prompt) => ({ image_input: [dataUrl], prompt }),
  },
];

const token = readFileSync(".env.local", "utf8").match(/REPLICATE_API_TOKEN=(.+)/)[1].trim();
const replicate = new Replicate({ auth: token });

async function runWithRetry(model, input) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await replicate.run(model, { input });
    } catch (err) {
      if (String(err).includes("429") && attempt < 10) {
        process.stdout.write("(限速,等15s) ");
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
mkdirSync(OUT_DIR, { recursive: true });
const dataUrl = `data:image/jpeg;base64,${readFileSync(inputPath).toString("base64")}`;

const TILE = 440;
async function tile(p, label) {
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="40"><rect width="${TILE}" height="40" fill="black" fill-opacity="0.65"/><text x="8" y="27" font-size="18" font-family="Arial" font-weight="bold" fill="white">${label}</text></svg>`;
  const buf = await sharp(p).resize({ width: TILE, height: TILE, fit: "cover" }).toBuffer();
  return sharp(buf).composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();
}

for (const style of styles) {
  console.log(`\n=== ${style.id} ===`);
  const tiles = [await tile(inputPath, "原图")];
  for (const e of ENGINES) {
    process.stdout.write(`${e.key} ... `);
    try {
      const out = await runWithRetry(e.model, e.input(dataUrl, style.prompt));
      const buf = await toBuffer(out);
      const outPath = `${OUT_DIR}/${style.id}--${e.key}.jpg`;
      await sharp(buf).jpeg({ quality: 92 }).toFile(outPath);
      const m = await sharp(outPath).metadata();
      console.log(`OK ${m.width}x${m.height}`);
      tiles.push(await tile(outPath, e.label));
    } catch (err) {
      console.log("FAILED:", String(err).slice(0, 130));
    }
  }
  const cols = 3, GAP = 5, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * TILE + (cols - 1) * GAP, height: rows * TILE + (rows - 1) * GAP, channels: 3, background: { r: 18, g: 18, b: 18 } } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (TILE + GAP), top: Math.floor(i / cols) * (TILE + GAP) })))
    .jpeg({ quality: 88 })
    .toFile(`${OUT_DIR}/${style.id}-总对比.jpg`);
  console.log(`grid -> ${OUT_DIR}/${style.id}-总对比.jpg`);
}
