import { NextRequest, NextResponse } from "next/server";
import { getJob, markPaid } from "@/lib/jobStore";
import { PRICE_USD } from "@/lib/brand";

export const runtime = "nodejs";

/**
 * Real Dodo Checkout wiring goes here once DODO_API_KEY (test mode) is in
 * hand — build against docs.dodopayments.com's Checkout + Webhooks section,
 * don't guess the request shape from memory.
 */
async function createDodoCheckoutSession(): Promise<never> {
  throw new Error(
    "Dodo Checkout not wired up yet — DODO_API_KEY is set but the real integration is still a TODO."
  );
}

export async function POST(req: NextRequest) {
  const { jobId } = (await req.json()) as { jobId?: string };
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found or expired, please re-upload." }, { status: 404 });
  }

  if (process.env.DODO_API_KEY) {
    try {
      await createDodoCheckoutSession();
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Dodo checkout failed." },
        { status: 501 }
      );
    }
  }

  // No Dodo key yet: this site cannot take real payments regardless, so the
  // pipeline is exercised in demo mode — mark paid directly instead of a
  // real checkout redirect. This path stops existing entirely the moment
  // DODO_API_KEY is configured (see branch above).
  markPaid(jobId);
  return NextResponse.json({ demo: true, redirectUrl: `/?jobId=${jobId}&paid=1`, priceUsd: PRICE_USD });
}
