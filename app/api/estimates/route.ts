import { NextRequest, NextResponse } from "next/server";
import { createEstimate, updateEstimate } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      propertyId,
      packageId,
      customerName,
      customerEmail,
      customerId,
      fromDate,
      toDate,
      total
    } = body;

    // Validation
    if (!propertyId || !customerName || !customerEmail || !customerId || !fromDate || !toDate || total === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ success: false, error: "Invalid check-in or check-out date." }, { status: 400 });
    }

    const estimate = await createEstimate({
      propertyId,
      packageId: packageId || null,
      customerName,
      customerEmail,
      customerId,
      fromDate: start.toISOString(),
      toDate: end.toISOString(),
      total: Number(total)
    });

    return NextResponse.json({ success: true, estimate }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/estimates error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { estimateId, packageId, total } = body;

    if (!estimateId) {
      return NextResponse.json({ success: false, error: "estimateId is required." }, { status: 400 });
    }

    const updated = await updateEstimate(estimateId, {
      packageId: packageId || null,
      total: Number(total)
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Estimate not found or update failed." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Estimate updated successfully." });
  } catch (error: any) {
    console.error("PATCH /api/estimates error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
