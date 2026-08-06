import { NextRequest, NextResponse } from "next/server";
import { getEstimateByToken, addGuestToEstimate } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, userId, email, name } = body;

    if (!token || !userId) {
      return NextResponse.json({ success: false, error: "Missing required fields (token, userId)" }, { status: 400 });
    }

    const estimate = await getEstimateByToken(token);
    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found for the provided token." }, { status: 404 });
    }

    // Check if estimate is expired
    if (estimate.toDate) {
      const toDate = new Date(estimate.toDate);
      if (!isNaN(toDate.getTime()) && toDate.getTime() < Date.now()) {
        return NextResponse.json({ success: false, error: "This estimate invitation has expired." }, { status: 410 });
      }
    }

    // Add guest
    const added = await addGuestToEstimate(estimate.id, userId, email, name);
    if (!added) {
      return NextResponse.json({ success: false, error: "Failed to join estimate." }, { status: 500 });
    }

    return NextResponse.json({ success: true, estimateId: estimate.id, message: "Successfully joined the estimate!" });
  } catch (error: any) {
    console.error("POST /api/estimates/accept-invite error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
