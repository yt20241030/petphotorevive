import { NextResponse } from "next/server";
import { getBlobTokenKey } from "@/lib/blobToken";

export const runtime = "nodejs";

/**
 * Config diagnostics — reports WHICH integrations are configured, never
 * any secret values. Safe to expose publicly.
 */
export async function GET() {
  return NextResponse.json({
    blobConfigured: Boolean(getBlobTokenKey()),
    blobTokenEnvName: getBlobTokenKey() ?? null,
    replicateConfigured: Boolean(process.env.REPLICATE_API_TOKEN),
    dodoConfigured: Boolean(process.env.DODO_API_KEY),
    engineOverride: process.env.RESTORE_ENGINE ?? null,
  });
}
