import { NextRequest, NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, amountInCents, bookingId } = body;

    if (!token || !amountInCents || !bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: token, amountInCents, and bookingId are required." },
        { status: 400 }
      );
    }

    const secretKey = process.env.YOCO_SEC?.trim();

    if (!secretKey) {
      // Fallback: If no keys are set, simulate successful charge for development
      console.warn("⚠️ No Yoco API keys found. Simulating successful backend charge.");
      await updateBookingStatus(bookingId, "paid");
      return NextResponse.json({ success: true, simulated: true });
    }

    // Call Yoco's charges API
    const response = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "X-Auth-Secret-Key": secretKey,
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: "ZAR",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.message || data?.error?.message || JSON.stringify(data);
      console.error("❌ Yoco charge failed:", errorMsg);
      await updateBookingStatus(bookingId, "failed");
      return NextResponse.json(
        { success: false, error: `Yoco Charge Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    if (data.status === "successful") {
      await updateBookingStatus(bookingId, "paid");
      return NextResponse.json({ success: true, data });
    } else {
      await updateBookingStatus(bookingId, "failed");
      return NextResponse.json(
        { success: false, error: `Yoco payment status is: ${data.status}` },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("POST /api/v1/charge error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process charge" },
      { status: 500 }
    );
  }
}
