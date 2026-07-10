import { NextRequest, NextResponse } from "next/server";
import { getJob, issueDownloadToken } from "@/lib/jobStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "Missing jobId." }, { status: 400 });

  const job = getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found or expired." }, { status: 404 });
  if (!job.paid) return NextResponse.json({ error: "Payment required." }, { status: 402 });

  const issued = issueDownloadToken(jobId);
  if (!issued) return NextResponse.json({ error: "Could not issue download link." }, { status: 500 });

  return NextResponse.json({
    url: `/api/download?jobId=${jobId}&token=${issued.token}`,
    expiresAt: issued.exp,
  });
}
