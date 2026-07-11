import { NextResponse } from "next/server";
import { getBlobTokenKey } from "@/lib/blobToken";

export const runtime = "nodejs";

/**
 * Config diagnostics — reports WHICH integrations are configured, never
 * any secret values. Safe to expose publicly.
 */
export async function GET() {
  return NextResponse.json({
    // Bump on watermark/cache-shape changes; lets deploy scripts poll for
    // "the new build is actually serving" instead of guessing with sleeps.
    buildTag: "studio-v1",
    blobConfigured: Boolean(getBlobTokenKey()),
    blobTokenEnvName: getBlobTokenKey() ?? null,
    replicateConfigured: Boolean(process.env.REPLICATE_API_TOKEN),
    dodoConfigured: Boolean(process.env.DODO_API_KEY),
    engineOverride: process.env.RESTORE_ENGINE ?? null,
  });
}
