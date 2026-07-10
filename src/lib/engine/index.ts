import type { RestoreEngine } from "./types";
import { sharpBasicEngine } from "./sharpBasic";
import { replicateRealesrganEngine } from "./replicateRealesrgan";

/**
 * Engine picked per-request based on REPLICATE_API_TOKEN presence, not
 * cached at module load — so adding the env var in Vercel takes effect
 * immediately on next request, no redeploy needed.
 */
export function getRestoreEngine(): RestoreEngine {
  return process.env.REPLICATE_API_TOKEN ? replicateRealesrganEngine : sharpBasicEngine;
}

export type { RestoreEngine, RestoreResult, RestoreEngineName } from "./types";
