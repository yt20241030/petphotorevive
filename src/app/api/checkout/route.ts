import { NextRequest, NextResponse } from "next/server";
import { addCredits, isValidAnonId } from "@/lib/userStore";

export const runtime = "nodejs";

/** Credit packs (founder-approved pricing, 2026-07-11). */
export const PACKS = {
  starter: { usd: 2.99, credits: 5 },
  standard: { usd: 4.99, credits: 20 },
  big: { usd: 9.99, credits: 50 },
} as const;

/**
 * Real Dodo Checkout wiring goes here once DODO_API_KEY (test mode) is in
 * hand — build against docs.dodopayments.com, don't guess the API shape.
 * The webhook (signature-verified) will be the only thing allowed to call
 * addCredits in production.
 */
async function createDodoCheckoutSession(): Promise<never> {
  throw new Error("Dodo Checkout not wired up yet — DODO_API_KEY is set but the integration is still a TODO.");
}

export async function POST(req: NextRequest) {
  const { pack, anonId } = (await req.json().catch(() => ({}))) as { pack?: string; anonId?: string };
  if (!isValidAnonId(anonId)) return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  const chosen = PACKS[pack as keyof typeof PACKS];
  if (!chosen) return NextResponse.json({ error: "Unknown pack." }, { status: 400 });

  if (process.env.DODO_API_KEY) {
    try {
      await createDodoCheckoutSession();
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Checkout failed." },
        { status: 501 }
      );
    }
  }

  // 创始人拍板(2026-07-11):未支付绝不发积分。Dodo 接入前,购买按钮
  // 一律如实告知"支付尚未开通"。DEMO_CREDITS=1 环境变量是内部联调的
  // 唯一例外(生产不设)。
  if (process.env.DEMO_CREDITS === "1") {
    const updated = await addCredits(anonId, chosen.credits);
    return NextResponse.json({ demo: true, credits: updated.credits, priceUsd: chosen.usd });
  }

  return NextResponse.json(
    { error: "Checkout isn't open yet — we're finishing payment setup. Your free tries still work." },
    { status: 503 }
  );
}
