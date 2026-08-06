import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, isUserAdmin, updateUserProfile } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId query parameter is required." }, { status: 400 });
    }

    const profile = await getUserProfile(userId);
    const isAdmin = await isUserAdmin(userId, email);
    return NextResponse.json({
      success: true,
      data: {
        isAdmin,
        plan: profile?.plan || (isAdmin ? "pro" : "free"),
        email: profile?.email || email || "",
        subdomain: profile?.subdomain || ""
      }
    });
  } catch (err: any) {
    console.error("GET /api/user/profile error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, subdomain } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
    }

    // Clean subdomain: lowercase, alphanumeric and dashes only, max 63 characters
    const cleanSubdomain = (subdomain || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .trim();

    const reserved = ["www", "admin", "api", "subdomain", "dashboard", "subscribe", "login", "bookings", "estimate"];
    if (cleanSubdomain && reserved.includes(cleanSubdomain)) {
      return NextResponse.json({ success: false, error: "This subdomain is reserved and cannot be used." }, { status: 400 });
    }

    // Save to user profile
    await updateUserProfile(userId, { subdomain: cleanSubdomain || null });

    return NextResponse.json({ success: true, data: { subdomain: cleanSubdomain || "" } });
  } catch (err: any) {
    console.error("POST /api/user/profile error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
