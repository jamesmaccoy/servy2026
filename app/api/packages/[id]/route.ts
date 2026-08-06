import { NextRequest, NextResponse } from "next/server";
import { getPackage, getProperty, deletePackage, isUserAdmin } from "@/lib/firebase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pkg = await getPackage(id);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Package not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pkg });
  } catch (err: any) {
    console.error("GET /api/packages/[id] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check admin permissions
    const userId = request.headers.get("x-user-id");
    const email = request.headers.get("x-user-email");
    if (!userId || !(await isUserAdmin(userId, email))) {
      return NextResponse.json({ success: false, error: "Unauthorized access: admin privileges required." }, { status: 403 });
    }

    // Verify package ownership via property
    const pkg = await getPackage(id);
    if (!pkg) {
      return NextResponse.json({ success: false, error: "Package not found." }, { status: 404 });
    }

    const property = await getProperty(pkg.propertyId);
    if (!property) {
      return NextResponse.json({ success: false, error: "Associated property not found." }, { status: 404 });
    }

    const propertyHostId = property.hostId || "mock_admin_example_com";
    if (propertyHostId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized: You do not own the property associated with this package." }, { status: 403 });
    }

    const success = await deletePackage(id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Package delete failed." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: "Package deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("DELETE /api/packages/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
