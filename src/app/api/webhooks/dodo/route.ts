import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Dodo Payments webhook — the ONLY thing allowed to mark a job as paid once
 * DODO_API_KEY/DODO_WEBHOOK_SECRET are real. Signature verification must be
 * implemented against docs.dodopayments.com's Webhooks section (then call
 * markPaid(jobId) from '@/lib/jobStore' with the verified event's jobId)
 * before this route is trusted; until then it refuses everything so a
 * forged request can never unlock a download.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured yet — set DODO_WEBHOOK_SECRET first." },
      { status: 501 }
    );
  }

  void req;
  return NextResponse.json(
    { error: "Dodo webhook signature verification not implemented yet." },
    { status: 501 }
  );
}
