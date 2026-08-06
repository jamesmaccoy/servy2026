import { NextRequest, NextResponse } from "next/server";
import { getLatestEstimateForUser } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId query param is required." }, { status: 400 });
    }

    const estimate = await getLatestEstimateForUser(userId);
    return NextResponse.json({ success: true, data: estimate });
  } catch (error: any) {
    console.error("GET /api/estimates/latest error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
