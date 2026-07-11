import { NextRequest, NextResponse } from "next/server";
import { getUser, isValidAnonId, FREE_TRIES } from "@/lib/userStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const anonId = req.nextUrl.searchParams.get("anonId");
  if (!isValidAnonId(anonId)) return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  const user = await getUser(anonId);
  return NextResponse.json({
    freeLeft: Math.max(0, FREE_TRIES - user.freeUsed),
    credits: user.credits,
  });
}
