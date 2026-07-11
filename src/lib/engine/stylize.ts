import sharp from "sharp";

/**
 * Portrait generation engine: Flux Kontext Pro (official commercial API)
 * applies the style instruction, then Real-ESRGAN x2 (face_enhance=false,
 * BSD) lifts the ~1MP Kontext output to HD for the paid download.
 * ~$0.044 per portrait.
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
        if (String(err).includes("429") && attempt < 6) {
          await new Promise((r) => setTimeout(r, 12000));
          continue;
        }
        throw err;
      }
    }
  };

  const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;
  const styled = await runWithRetry("black-forest-labs/flux-kontext-pro", {
    input_image: dataUrl,
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
