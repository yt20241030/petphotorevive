export interface FaceGateResult {
  ok: boolean;
  reason?: "no-face" | "check-failed";
}

/**
 * 🔴 Safety gate (highest priority): if the pet's face isn't clearly
 * visible, the generator WILL invent a different pet — proven twice in
 * live experiments (rear-view photo → fully fabricated face).
 *
 * Implementation: moondream2 VQA (Apache-2.0, Replicate-hosted, ~$0.001).
 * Grounding DINO was tried first and rejected: it "detects" dog faces and
 * even eyes on a rear-view photo (0.4 confidence false positives) — box
 * detection can't distinguish "head from behind" from "face visible".
 * The VQA question discriminated correctly on all three test photos
 * (rear→No, face→Yes, blurry-but-visible→Yes).
 *
 * Runs BEFORE any quota/credit is consumed and before the expensive
 * generation call. Fails CLOSED on "No", fails OPEN only on infra errors
 * (surfaced as check-failed for the route to decide).
 */
const QUESTION =
  "Look at this photo. Can you clearly see the pet animal's face with its eyes visible? Answer with only yes or no.";

export async function checkPetFace(input: Buffer): Promise<FaceGateResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    // Local dev without a token (placeholder engine mode): pass so the UI
    // flow is testable; production always has the token.
    return { ok: true };
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: token });

  // Community model — the predictions endpoint needs a pinned version.
  const model = await (
    await fetch("https://api.replicate.com/v1/models/lucataco/moondream2", {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const version = (model as { latest_version: { id: string } }).latest_version.id;

  const dataUrl = `data:image/jpeg;base64,${input.toString("base64")}`;

  let output: unknown;
  for (let attempt = 1; ; attempt++) {
    try {
      output = await replicate.run(`lucataco/moondream2:${version}`, {
        input: { image: dataUrl, prompt: QUESTION },
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

  const text = (Array.isArray(output) ? output.join("") : String(output)).trim().toLowerCase();
  if (text.startsWith("yes")) return { ok: true };
  if (text.startsWith("no")) return { ok: false, reason: "no-face" };
  // Unexpected answer shape — treat as not-verifiable rather than guessing.
  return { ok: false, reason: "check-failed" };
}

export const FACE_GATE_MESSAGE =
  "We couldn't see your pet's face clearly. We won't guess — try a photo where their face is visible.";
