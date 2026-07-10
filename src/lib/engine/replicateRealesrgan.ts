import type { RestoreEngine, RestoreResult } from "./types";

/**
 * Real engine — Replicate nightmareai/real-esrgan, face_enhance=false (BSD,
 * commercial-safe; face_enhance pulls in non-commercial GFPGAN/DFDNet, never
 * enable it), scale=2. Only runs when REPLICATE_API_TOKEN is set.
 */
export const replicateRealesrganEngine: RestoreEngine = {
  name: "replicate-realesrgan",
  async restore(input: Buffer): Promise<RestoreResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }

    const Replicate = (await import("replicate")).default;
    const replicate = new Replicate({ auth: token });

    const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;

    const output = await replicate.run(
      "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7",
      {
        input: {
          image: dataUrl,
          scale: 2,
          face_enhance: false,
        },
      }
    );

    const url = Array.isArray(output) ? output[0] : (output as unknown as string);
    const res = await fetch(url as string);
    const buffer = Buffer.from(await res.arrayBuffer());

    return { engine: "replicate-realesrgan", buffer };
  },
};
