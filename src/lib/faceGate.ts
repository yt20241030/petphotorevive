import sharp from "sharp";

export interface FaceGateResult {
  ok: boolean;
  reason?: "no-face" | "face-too-small" | "face-blurred";
}

interface DinoDetection {
  label: string;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2]
}

/**
 * 🔴 Safety gate (highest priority): if the pet's face isn't clearly
 * visible, the generator WILL invent a different pet — proven in the
 * art-portrait experiment (rear-view photo → fabricated face). So: detect
 * a pet face with Grounding DINO (Apache-2.0, Replicate-hosted); no clear
 * face → refuse to generate, charge nothing.
 *
 * Runs BEFORE any quota/credit is consumed and before the expensive
 * generation call. Cost ~$0.002/check.
 */
export async function checkPetFace(input: Buffer): Promise<FaceGateResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    // Local dev without a token (sharp-basic placeholder mode): let it pass
    // so the UI flow is testable; production always has the token.
    return { ok: true };
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: token });

  const meta = await sharp(input).metadata();
  const imgW = meta.width ?? 1;
  const imgH = meta.height ?? 1;

  const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;

  // Community model: predictions endpoint needs a pinned version.
  const model = await (
    await fetch("https://api.replicate.com/v1/models/adirik/grounding-dino", {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const version = (model as { latest_version: { id: string } }).latest_version.id;

  let output: unknown;
  for (let attempt = 1; ; attempt++) {
    try {
      output = await replicate.run(`adirik/grounding-dino:${version}`, {
        input: {
          image: dataUrl,
          query: "dog face, cat face, pet animal face",
          box_threshold: 0.3,
          text_threshold: 0.25,
          show_visualisation: false,
        },
      });
      break;
    } catch (err) {
      if (String(err).includes("429") && attempt < 5) {
        await new Promise((r) => setTimeout(r, 12000));
        continue;
      }
      throw err;
    }
  }

  const detections = ((output as { detections?: DinoDetection[] })?.detections ?? []) as DinoDetection[];
  const faces = detections
    .filter((d) => d.confidence >= 0.35)
    .map((d) => {
      const [x1, y1, x2, y2] = d.bbox;
      return { x1, y1, x2, y2, area: Math.max(0, x2 - x1) * Math.max(0, y2 - y1) };
    })
    .sort((a, b) => b.area - a.area);

  if (faces.length === 0) return { ok: false, reason: "no-face" };

  const face = faces[0];
  // Face must occupy a meaningful part of the frame (>= ~2% of pixels) or
  // there isn't enough detail to preserve likeness from.
  if (face.area < imgW * imgH * 0.02) return { ok: false, reason: "face-too-small" };

  // Blur check on the face crop itself: variance of the Laplacian.
  const left = Math.max(0, Math.round(face.x1));
  const top = Math.max(0, Math.round(face.y1));
  const w = Math.min(imgW - left, Math.round(face.x2 - face.x1));
  const h = Math.min(imgH - top, Math.round(face.y2 - face.y1));
  if (w > 8 && h > 8) {
    const { data, info } = await sharp(input)
      .extract({ left, top, width: w, height: h })
      .greyscale()
      .resize({ width: 200, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0, sumSq = 0, n = 0;
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < info.width - 1; x++) {
        const i = y * info.width + x;
        const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - info.width] - data[i + info.width];
        sum += lap; sumSq += lap * lap; n++;
      }
    }
    const m = sum / n;
    const variance = sumSq / n - m * m;
    if (variance < 25) return { ok: false, reason: "face-blurred" };
  }

  return { ok: true };
}

export const FACE_GATE_MESSAGE =
  "We couldn't see your pet's face clearly. We won't guess — try a photo where their face is visible.";
