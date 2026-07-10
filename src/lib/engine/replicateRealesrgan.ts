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

    // Unpinned "owner/model" form (no ":version" hash) — Replicate resolves
    // it to that model's current latest version server-side. Avoids baking
    // in a version hash from memory that can go stale/invalid over time.
    const output = await replicate.run("nightmareai/real-esrgan", {
      input: {
        image: dataUrl,
        scale: 2,
        face_enhance: false,
      },
    });

    const url = Array.isArray(output) ? output[0] : (output as unknown as string);
    const res = await fetch(url as string);
    const buffer = Buffer.from(await res.arrayBuffer());

    return { engine: "replicate-realesrgan", buffer };
  },
};
