import type { RestoreEngine } from "./types";
import { sharpBasicEngine } from "./sharpBasic";
import { replicateRealesrganEngine } from "./replicateRealesrgan";
import { fluxRestoreEngine } from "./fluxRestore";

/**
 * Engine picked per-request based on env, not cached at module load — so
 * changing env vars in Vercel takes effect on the next request.
 *
 * - No REPLICATE_API_TOKEN → sharp-basic (free local placeholder).
 * - Token present → flux-restore (primary, founder decision 2026-07-10).
 * - Token present + RESTORE_ENGINE=realesrgan → Real-ESRGAN only (backup
 *   "enhance-only, no re-rendering" mode, kept for a future product tier).
 */
export function getRestoreEngine(): RestoreEngine {
  if (!process.env.REPLICATE_API_TOKEN) return sharpBasicEngine;
  if (process.env.RESTORE_ENGINE === "realesrgan") return replicateRealesrganEngine;
  return fluxRestoreEngine;
}

export type { RestoreEngine, RestoreResult, RestoreEngineName } from "./types";
