import { NextRequest, NextResponse } from "next/server";
import { getHostIdBySubdomain, getUserProfile } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get("subdomain");

    if (!subdomain) {
      return NextResponse.json({ success: false, error: "subdomain query parameter is required." }, { status: 400 });
    }

    const hostId = await getHostIdBySubdomain(subdomain);
    if (!hostId) {
      return NextResponse.json({ success: false, error: "Host profile not found for this subdomain." }, { status: 404 });
    }

    const profile = await getUserProfile(hostId);
    return NextResponse.json({
      success: true,
      data: {
        hostId,
        subdomain,
        email: profile?.email || "Host",
        displayName: profile?.displayName || profile?.email?.split("@")[0] || "Host"
      }
    });
  } catch (err: any) {
    console.error("GET /api/host/profile error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
