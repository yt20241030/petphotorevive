import { NextRequest, NextResponse } from "next/server";
import { getJob, markPaid, issueDownloadToken } from "@/lib/jobStore";
import { isValidAnonId, spendCredits } from "@/lib/userStore";

export const runtime = "nodejs";

/** Unlock the HD original of a previously free-generated portrait: 1 credit. */
export async function POST(req: NextRequest) {
  const { jobId, anonId } = (await req.json().catch(() => ({}))) as { jobId?: string; anonId?: string };
  if (!jobId) return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  if (!isValidAnonId(anonId)) return NextResponse.json({ error: "Missing session id." }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Portrait not found or expired." }, { status: 404 });

  if (!job.paid) {
    const updated = await spendCredits(anonId, 1);
    if (!updated) {
      return NextResponse.json(
        { error: "Not enough credits. Get a credit pack to unlock HD.", needCredits: true },
        { status: 402 }
      );
    }
    await markPaid(jobId);
  }

  const issued = await issueDownloadToken(jobId);
  if (!issued) return NextResponse.json({ error: "Could not issue download link." }, { status: 500 });

  return NextResponse.json({
    url: `/api/download?jobId=${jobId}&token=${issued.token}`,
    expiresAt: issued.exp,
  });
}
