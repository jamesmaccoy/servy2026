import { NextRequest, NextResponse } from "next/server";
import { saveUserDates, getUserDates } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const dates = await getUserDates(userId);
    return NextResponse.json({ success: true, data: dates });
  } catch (err: any) {
    console.error("GET /api/user/dates error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, fromDate, toDate } = body;

    if (!userId || !fromDate || !toDate) {
      return NextResponse.json({ success: false, error: "Missing required fields (userId, fromDate, toDate)" }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ success: false, error: "Invalid check-in or check-out date parameters." }, { status: 400 });
    }

    const dates = await saveUserDates(userId, start.toISOString(), end.toISOString());
    return NextResponse.json({ success: true, data: dates });
  } catch (err: any) {
    console.error("POST /api/user/dates error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
