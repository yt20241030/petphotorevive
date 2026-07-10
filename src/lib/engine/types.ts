export type RestoreEngineName = "sharp-basic" | "replicate-realesrgan" | "flux-restore";

export interface RestoreResult {
  engine: RestoreEngineName;
  /** Restored full-resolution image bytes (JPEG). */
  buffer: Buffer;
}

export interface RestoreEngine {
  name: RestoreEngineName;
  restore(input: Buffer): Promise<RestoreResult>;
}
