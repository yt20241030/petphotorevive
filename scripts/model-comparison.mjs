// Local, one-off model shootout for picking the best commercially-safe
// upscaler. Reads REPLICATE_API_TOKEN from .env.local (never committed).
// Usage: node scripts/model-comparison.mjs <input-image>
// Outputs per-model results + a labeled side-by-side grid into 测试对比/.
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import Replicate from "replicate";

// Output dir is derived per input file so runs don't overwrite each other.
let OUT_DIR = "测试对比/模型横评";

// Each candidate: display label, license verdict (for the report), and a
// run() that returns the restored image URL or Buffer.
const CANDIDATES = [
  {
    key: "realesrgan-x2",
    label: "Real-ESRGAN x2 (现行)",
    license: "BSD-3 可商用",
    input: (dataUrl) => ({
      model: "nightmareai/real-esrgan",
      input: { image: dataUrl, scale: 2, face_enhance: false },
    }),
  },
  {
    key: "realesrgan-x4",
    label: "Real-ESRGAN x4",
    license: "BSD-3 可商用",
    input: (dataUrl) => ({
      model: "nightmareai/real-esrgan",
      input: { image: dataUrl, scale: 4, face_enhance: false },
    }),
  },
  {
    key: "realesrgan-x4-sharp",
    label: "Real-ESRGAN x4 + 锐化",
    license: "BSD-3 可商用(锐化是本地 sharp 后处理)",
    input: (dataUrl) => ({
      model: "nightmareai/real-esrgan",
      input: { image: dataUrl, scale: 4, face_enhance: false },
    }),
    postSharpen: true,
  },
  {
    key: "swin2sr",
    label: "Swin2SR real-world x4",
    license: "Apache-2.0 可商用",
    // Community model — needs a pinned version (resolved at runtime in
    // main()) or the predictions endpoint 404s.
    needsVersion: "mv-lab/swin2sr",
    input: (dataUrl) => ({
      model: "mv-lab/swin2sr",
      input: { image: dataUrl, task: "real_sr" },
    }),
  },
  {
    key: "recraft-crisp",
    label: "Recraft Crisp Upscale",
    license: "Recraft 官方商用 API(按次付费)",
    input: (dataUrl) => ({
      model: "recraft-ai/recraft-crisp-upscale",
      input: { image: dataUrl },
    }),
  },
  {
    key: "topaz",
    label: "Topaz Image Upscale",
    license: "Topaz Labs 官方商用 API(约$0.05/张)",
    input: (dataUrl) => ({
      model: "topazlabs/image-upscale",
      input: { image: dataUrl, enhance_model: "Standard V2" },
    }),
  },
];

function loadToken() {
  const envFile = readFileSync(".env.local", "utf8");
  const m = envFile.match(/^REPLICATE_API_TOKEN=(.+)$/m);
  const token = m?.[1]?.trim();
  if (!token) {
    console.error("请先把 Replicate token 粘贴进 .env.local 的 REPLICATE_API_TOKEN= 后面");
    process.exit(1);
  }
  return token;
}

async function outputToBuffer(output) {
  const url = Array.isArray(output) ? output[0] : output;
  if (typeof url === "string") {
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }
  // SDK may return a FileOutput object with .url()
  if (url && typeof url.url === "function") {
    const res = await fetch(url.url());
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unrecognized output shape: " + JSON.stringify(output).slice(0, 200));
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !existsSync(inputPath)) {
    console.error("Usage: node scripts/model-comparison.mjs <input-image>");
    process.exit(1);
  }
  const base = inputPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
  OUT_DIR = `测试对比/模型横评_${base}`;
  mkdirSync(OUT_DIR, { recursive: true });

  const token = loadToken();
  const replicate = new Replicate({ auth: token });
  const inputBuf = readFileSync(inputPath);
  const dataUrl = `data:image/jpeg;base64,${inputBuf.toString("base64")}`;

  const results = [];
  for (const c of CANDIDATES) {
    process.stdout.write(`running ${c.key} ... `);
    try {
      let { model, input } = c.input(dataUrl);
      if (c.needsVersion) {
        const info = await (
          await fetch(`https://api.replicate.com/v1/models/${c.needsVersion}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).json();
        model = `${c.needsVersion}:${info.latest_version.id}`;
      }
      // Retry through the low-credit 429 rate limit (6/min burst 1).
      let output;
      for (let attempt = 1; ; attempt++) {
        try {
          output = await replicate.run(model, { input });
          break;
        } catch (err) {
          if (String(err).includes("429") && attempt < 6) {
            process.stdout.write(`(限速,等15s重试) `);
            await new Promise((r) => setTimeout(r, 15000));
            continue;
          }
          throw err;
        }
      }
      let buf = await outputToBuffer(output);
      if (c.postSharpen) {
        buf = await sharp(buf).sharpen({ sigma: 1.0 }).jpeg({ quality: 95 }).toBuffer();
      }
      const outPath = `${OUT_DIR}/${c.key}.jpg`;
      await sharp(buf).jpeg({ quality: 95 }).toFile(outPath);
      const meta = await sharp(outPath).metadata();
      console.log(`OK ${meta.width}x${meta.height}`);
      results.push({ ...c, outPath, ok: true });
    } catch (err) {
      console.log("FAILED:", String(err).slice(0, 160));
      results.push({ ...c, ok: false, error: String(err).slice(0, 300) });
    }
  }

  // Build a labeled comparison grid: original + each successful result,
  // center-cropped to the same region so detail differences are visible.
  const TILE = 560;
  const tiles = [];
  const labelSvg = (text) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="44"><rect width="${TILE}" height="44" fill="black" fill-opacity="0.65"/><text x="10" y="30" font-size="22" font-family="sans-serif" font-weight="bold" fill="white">${text}</text></svg>`;

  async function makeTile(imgPath, label) {
    const buf = await sharp(imgPath)
      .resize({ width: TILE, height: TILE, fit: "cover", position: "attention" })
      .toBuffer();
    return sharp(buf)
      .composite([{ input: Buffer.from(labelSvg(label)), top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  tiles.push(await makeTile(inputPath, "原图 BEFORE"));
  for (const r of results) if (r.ok) tiles.push(await makeTile(r.outPath, r.label));

  const cols = 2;
  const rows = Math.ceil(tiles.length / cols);
  const GAP = 6;
  const W = cols * TILE + (cols - 1) * GAP;
  const H = rows * TILE + (rows - 1) * GAP;
  const composites = tiles.map((t, i) => ({
    input: t,
    left: (i % cols) * (TILE + GAP),
    top: Math.floor(i / cols) * (TILE + GAP),
  }));
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } } })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(`${OUT_DIR}/总对比.jpg`);

  console.log("\n=== 汇总 ===");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.label} | ${r.license}${r.ok ? "" : " | " + r.error}`);
  }
  console.log(`\n对比图: ${OUT_DIR}/总对比.jpg`);
}

main();
