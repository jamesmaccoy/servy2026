import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "@/lib/yoco";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, plan, amountInCents } = body;

    if (!userId || !plan || !amountInCents) {
      return NextResponse.json({ success: false, error: "Missing required parameters (userId, plan, amountInCents)" }, { status: 400 });
    }

    const host = request.headers.get("host") || "";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const siteUrl = host ? `${proto}://${host}` : request.nextUrl.origin;

    const description = `${plan === "standard" ? "Standard" : "Pro"} Pro Subscription Plan`;

    // Initialize Yoco checkout flow with "subscription" metadata
    const redirectUrl = await createCheckout({
      amountInCents: Number(amountInCents),
      description,
      metadata: {
        intent: "subscription",
        userId,
        plan
      },
      siteUrl
    });

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err: any) {
    console.error("Subscription checkout error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
