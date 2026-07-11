// Re-test only the styles whose first round failed likeness/red-line review
// (invented tan patches / creepy teeth / trademark logo), after prompt fixes.
// Usage: node scripts/retest-styles.mjs <input-image> <styleId> [styleId...]
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

const OUT_DIR = "测试对比/12风格实测/第二轮";

const tsSource = readFileSync("src/lib/styles.ts", "utf8");
const KEEP = tsSource.match(/const KEEP =\s*\n?\s*"([^"]+)"/)[1];
const entries = [...tsSource.matchAll(/id: "([a-z-]+)",\s*\n\s*name: "([^"]+)",\s*\n\s*prompt: `([^`]+)`/g)].map(
  (m) => ({ id: m[1], name: m[2], prompt: m[3].replaceAll("${KEEP}", KEEP).replace(/\$\{KEEP\.replace\([^}]+\)\}/, KEEP.replace("Do not change the animal's breed, proportions or pose.", "Keep the same pose.")) })
);

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

const [inputPath, ...ids] = process.argv.slice(2);
mkdirSync(OUT_DIR, { recursive: true });
const dataUrl = `data:image/jpeg;base64,${readFileSync(inputPath).toString("base64")}`;

const targets = entries.filter((e) => ids.includes(e.id));
console.log("retesting:", targets.map((t) => t.id).join(", "));
const tiles = [];
const TILE = 460;
async function tile(p, label) {
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="40"><rect width="${TILE}" height="40" fill="black" fill-opacity="0.65"/><text x="8" y="27" font-size="19" font-family="Arial" font-weight="bold" fill="white">${label}</text></svg>`;
  const buf = await sharp(p).resize({ width: TILE, height: TILE, fit: "cover" }).toBuffer();
  return sharp(buf).composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();
}
tiles.push(await tile(inputPath, "原图"));
for (const s of targets) {
  process.stdout.write(`${s.id} ... `);
  try {
    const out = await runWithRetry("black-forest-labs/flux-kontext-pro", {
      input_image: dataUrl,
      prompt: s.prompt,
      output_format: "jpg",
    });
    const url = Array.isArray(out) ? out[0] : out;
    const res = await fetch(typeof url === "string" ? url : url.url());
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).jpeg({ quality: 92 }).toFile(`${OUT_DIR}/${s.id}.jpg`);
    console.log("OK");
    tiles.push(await tile(`${OUT_DIR}/${s.id}.jpg`, s.name + " (v2)"));
  } catch (err) {
    console.log("FAILED:", String(err).slice(0, 120));
  }
}
const cols = 3, GAP = 5, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * TILE + (cols - 1) * GAP, height: rows * TILE + (rows - 1) * GAP, channels: 3, background: { r: 18, g: 18, b: 18 } } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (TILE + GAP), top: Math.floor(i / cols) * (TILE + GAP) })))
  .jpeg({ quality: 88 })
  .toFile(`${OUT_DIR}/总对比.jpg`);
console.log(`grid -> ${OUT_DIR}/总对比.jpg`);
