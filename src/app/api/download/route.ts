import { NextRequest, NextResponse } from "next/server";
import { consumeDownloadToken } from "@/lib/jobStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const token = req.nextUrl.searchParams.get("token");
  if (!jobId || !token) {
    return NextResponse.json({ error: "Missing jobId or token." }, { status: 400 });
  }

  const job = consumeDownloadToken(jobId, token);
  if (!job) {
    return NextResponse.json({ error: "Link is invalid, already used, or expired." }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(job.cleanBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="petphotorevive-${job.id}.jpg"`,
      "Cache-Control": "no-store",
    },
  });
}
