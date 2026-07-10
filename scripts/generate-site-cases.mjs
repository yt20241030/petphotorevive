// Builds the landing-page before/after case assets from the old-photo
// shootout results. All "before" sources are 1900s-1910s public-domain
// photos (Wikimedia Commons); all "after" images are our own Flux Restore
// outputs. Before/after in each pair are resized to identical dimensions
// so the comparison slider overlays them exactly.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const CASES = [
  // [before, after, out-prefix, width, height, cropPosition]
  ["测试对比/老照片横评/old4_postcardcat.jpg", "测试对比/老照片横评/old4_postcardcat_结果/flux-restore-seed2.jpg", "hero", 1200, 800, "centre"],
  ["测试对比/老照片横评/old3_kitchencat.jpg", "测试对比/老照片横评/old3_kitchencat_结果/flux-restore-seed1.jpg", "case-faded", 800, 800, "south"],
  ["测试对比/老照片横评/old1_blackdog.jpg", "测试对比/老照片横评/old1_blackdog_结果/flux-restore-seed1.jpg", "case-bw", 800, 800, "centre"],
  ["测试对比/老照片横评/old2_bournedog.jpg", "测试对比/老照片横评/old2_bournedog_结果/flux-restore-seed2.jpg", "case-damaged", 800, 800, "centre"],
];

mkdirSync("public/demo", { recursive: true });

for (const [before, after, prefix, w, h, position] of CASES) {
  await sharp(before).resize({ width: w, height: h, fit: "cover", position }).jpeg({ quality: 88 }).toFile(`public/demo/${prefix}-before.jpg`);
  await sharp(after).resize({ width: w, height: h, fit: "cover", position }).jpeg({ quality: 88 }).toFile(`public/demo/${prefix}-after.jpg`);
  console.log(`${prefix}: ${w}x${h}`);
}
