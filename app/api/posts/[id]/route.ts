import { NextRequest, NextResponse } from "next/server";
import { getProperty, createProperty, deleteProperty, isUserAdmin } from "@/lib/firebase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const property = await getProperty(id);
    if (!property) {
      return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: property });
  } catch (err: any) {
    console.error("GET /api/posts/[id] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check admin/host permissions
    const userId = request.headers.get("x-user-id");
    const email = request.headers.get("x-user-email");
    if (!userId || !(await isUserAdmin(userId, email))) {
      return NextResponse.json({ success: false, error: "Unauthorized access: admin privileges required." }, { status: 403 });
    }

    // Retrieve existing property to verify ownership
    const existing = await getProperty(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    }

    // Verify host tenancy ownership (allow if matching hostId, or if existing has no hostId, or if it is default host)
    const propertyHostId = existing.hostId || "mock_admin_example_com";
    if (propertyHostId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized: You do not own this property listing." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, name, slug, basePricePerNight, airbnbCalendarUrl, googleCalendarUrl, description, images, bookingType, slots, location } = body;

    const resolvedTitle = title || name;
    if (!resolvedTitle || !slug || basePricePerNight === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields (title/name, slug, basePricePerNight)" }, { status: 400 });
    }

    const price = Number(basePricePerNight);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ success: false, error: "basePricePerNight must be a positive number" }, { status: 400 });
    }

    // Call createProperty passing the id to ensure overwrite/update rather than duplicate
    const property = await createProperty({
      id,
      title: resolvedTitle,
      name: resolvedTitle,
      slug: slug.trim().toLowerCase(),
      basePricePerNight: price,
      airbnbCalendarUrl: airbnbCalendarUrl || "",
      googleCalendarUrl: googleCalendarUrl || "",
      hostId: propertyHostId, // Keep original hostId
      description: description !== undefined ? description : (existing.description || ""),
      images: images !== undefined ? images : (existing.images || []),
      bookingType: bookingType !== undefined ? bookingType : (existing.bookingType || "nightly"),
      slots: slots !== undefined ? slots : (existing.slots || []),
      location: location !== undefined ? location : (existing.location || "")
    });

    return NextResponse.json({ success: true, data: property });
  } catch (err: any) {
    console.error("PUT /api/posts/[id] error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check admin/host permissions
    const userId = request.headers.get("x-user-id");
    const email = request.headers.get("x-user-email");
    if (!userId || !(await isUserAdmin(userId, email))) {
      return NextResponse.json({ success: false, error: "Unauthorized access: admin privileges required." }, { status: 403 });
    }

    // Retrieve existing property to verify ownership
    const existing = await getProperty(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 });
    }

    // Verify host tenancy ownership
    const propertyHostId = existing.hostId || "mock_admin_example_com";
    if (propertyHostId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized: You do not own this property listing." }, { status: 403 });
    }

    const success = await deleteProperty(id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Property not found or delete failed." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: "Property deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
