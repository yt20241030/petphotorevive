import sharp from "sharp";

/**
 * Portrait generation engine — Google Nano Banana (founder decision
 * 2026-07-11 after three rounds of shootouts). The deciding evidence: it
 * was the only engine with zero coat-color fabrication across BOTH test
 * pets (black-white dog 11/11 AND solid-white cat 3/3); Seedream 4.5 won
 * on style flair but invented ginger patches on the white cat, and
 * Kontext Pro/Max failed color fidelity systematically. Then Real-ESRGAN
 * x2 (face_enhance=false, BSD) lifts the output to HD for the paid
 * download. ~$0.045 per portrait all-in.
 */
export async function stylizePhoto(input: Buffer, prompt: string): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    // Local placeholder so the UI flow is testable without spend: sepia-ish
    // filter standing in for a real style.
    return sharp(input).modulate({ saturation: 0.5 }).tint({ r: 230, g: 200, b: 160 }).jpeg({ quality: 92 }).toBuffer();
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: token });

  const runWithRetry = async (model: `${string}/${string}`, input: object) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await replicate.run(model, { input });
      } catch (err) {
        const s = String(err);
        // 429: low-credit rate tier; fetch failed: transient network blips
        // seen repeatedly when downloading outputs.
        if ((s.includes("429") || s.includes("fetch failed")) && attempt < 6) {
          await new Promise((r) => setTimeout(r, 12000));
          continue;
        }
        throw err;
      }
    }
  };

  const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;
  const styled = await runWithRetry("google/nano-banana", {
    image_input: [dataUrl],
    prompt,
    output_format: "jpg",
  });
  const styledBuf = await outputToBuffer(styled);

  const upscaled = await runWithRetry("nightmareai/real-esrgan", {
    image: `data:image/jpeg;base64,${styledBuf.toString("base64")}`,
    scale: 2,
    face_enhance: false,
  });
  const upscaledBuf = await outputToBuffer(upscaled);

  return sharp(upscaledBuf).jpeg({ quality: 95 }).toBuffer();
}

async function outputToBuffer(output: unknown): Promise<Buffer> {
  const first = Array.isArray(output) ? output[0] : output;
  if (typeof first === "string") {
    const res = await fetch(first);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first && typeof (first as { url?: unknown }).url === "function") {
    const res = await fetch((first as { url: () => string }).url());
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unrecognized Replicate output shape");
}
