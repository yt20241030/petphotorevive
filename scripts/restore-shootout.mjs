// Old-photo restoration shootout: flux-kontext restore-image (2 seeds, to
// expose fabrication variance — the model has no fidelity knob) vs
// Real-ESRGAN x4+sharpen vs Topaz LowRes V2 4x, on public-domain vintage
// pet photos. Internal evaluation only. Reads token from .env.local.
// Usage: node scripts/restore-shootout.mjs
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

const IMAGES = [
  "测试对比/老照片横评/old1_blackdog.jpg",
  "测试对比/老照片横评/old2_bournedog.jpg",
  "测试对比/老照片横评/old3_kitchencat.jpg",
  "测试对比/老照片横评/old4_postcardcat.jpg",
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
  const url = Array.isArray(output) ? output[0] : output;
  const res = await fetch(typeof url === "string" ? url : url.url());
  return Buffer.from(await res.arrayBuffer());
}

const CANDIDATES = [
  {
    key: "flux-restore-seed1",
    label: "Flux Restore (seed 1)",
    run: (dataUrl) => runWithRetry("flux-kontext-apps/restore-image", { input_image: dataUrl, seed: 1111, output_format: "jpg" }),
  },
  {
    key: "flux-restore-seed2",
    label: "Flux Restore (seed 2)",
    run: (dataUrl) => runWithRetry("flux-kontext-apps/restore-image", { input_image: dataUrl, seed: 9999, output_format: "jpg" }),
  },
  {
    key: "esrgan-x4-sharp",
    label: "Real-ESRGAN x4+锐化",
    run: async (dataUrl) => {
      const out = await runWithRetry("nightmareai/real-esrgan", { image: dataUrl, scale: 4, face_enhance: false });
      const buf = await toBuffer(out);
      return sharp(buf).sharpen({ sigma: 1.0 }).jpeg({ quality: 95 }).toBuffer();
    },
  },
  {
    key: "topaz-lowres-4x",
    label: "Topaz LowRes V2 + 4x",
    run: (dataUrl) => runWithRetry("topazlabs/image-upscale", { image: dataUrl, enhance_model: "Low Resolution V2", upscale_factor: "4x", face_enhancement: false }),
  },
];

async function makeTile(input, label, TILE) {
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="44"><rect width="${TILE}" height="44" fill="black" fill-opacity="0.65"/><text x="10" y="30" font-size="21" font-family="sans-serif" font-weight="bold" fill="white">${label}</text></svg>`;
  const buf = await sharp(input)
    .resize({ width: TILE, height: TILE, fit: "contain", background: { r: 20, g: 20, b: 20 } })
    .toBuffer();
  return sharp(buf).composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }]).jpeg({ quality: 92 }).toBuffer();
}

async function main() {
  for (const imgPath of IMAGES) {
    const base = imgPath.split("/").pop().replace(/\.[^.]+$/, "");
    const outDir = `测试对比/老照片横评/${base}_结果`;
    mkdirSync(outDir, { recursive: true });
    console.log(`\n=== ${base} ===`);

    const dataUrl = `data:image/jpeg;base64,${readFileSync(imgPath).toString("base64")}`;
    const tilePaths = [[imgPath, "原图 BEFORE"]];

    for (const c of CANDIDATES) {
      process.stdout.write(`${c.key} ... `);
      try {
        const out = await c.run(dataUrl);
        const buf = Buffer.isBuffer(out) ? out : await toBuffer(out);
        const outPath = `${outDir}/${c.key}.jpg`;
        await sharp(buf).jpeg({ quality: 95 }).toFile(outPath);
        const m = await sharp(outPath).metadata();
        console.log(`OK ${m.width}x${m.height}`);
        tilePaths.push([outPath, c.label]);
      } catch (err) {
        console.log("FAILED:", String(err).slice(0, 140));
      }
    }

    // 2-col grid: original + up to 4 results.
    const TILE = 620;
    const tiles = [];
    for (const [p, label] of tilePaths) tiles.push(await makeTile(p, label, TILE));
    const cols = 2, GAP = 6;
    const rows = Math.ceil(tiles.length / cols);
    await sharp({
      create: { width: cols * TILE + GAP, height: rows * TILE + (rows - 1) * GAP, channels: 3, background: { r: 20, g: 20, b: 20 } },
    })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (TILE + GAP), top: Math.floor(i / cols) * (TILE + GAP) })))
      .jpeg({ quality: 90 })
      .toFile(`${outDir}/总对比.jpg`);
    console.log(`grid -> ${outDir}/总对比.jpg`);
  }
}

main();
