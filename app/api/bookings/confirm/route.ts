import { NextRequest, NextResponse } from "next/server";
import { getEstimate, updateEstimateStatus, createBooking, listBookings, getProperty } from "@/lib/firebase";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { estimateId, paymentStatus, customerId, customerEmail, customerName } = body;

    if (!estimateId) {
      return NextResponse.json({ success: false, error: "estimateId is required." }, { status: 400 });
    }

    const estimate = await getEstimate(estimateId);
    if (!estimate) {
      return NextResponse.json({ success: false, error: "Estimate not found." }, { status: 404 });
    }

    const property = await getProperty(estimate.propertyId);
    const isHourly = property?.bookingType === "hourly";

    // Resolve target customer credentials (passed from checkout redirect fallback or fallback to estimate owner)
    const targetEmail = customerEmail || estimate.customerEmail;
    const targetId = customerId || estimate.customerId;
    const targetName = customerName || estimate.customerName;

    // Check if booking already exists for this estimateId & customer
    const existingBookings = await listBookings();
    const existingBooking = existingBookings.find((b: any) => {
      if (isHourly) {
        return b.estimateId === estimateId && (b.customerEmail === targetEmail || b.customerId === targetId);
      } else {
        return b.estimateId === estimateId;
      }
    });

    if (existingBooking) {
      return NextResponse.json({ success: true, booking: existingBooking, message: "Booking already confirmed." });
    }

    // Create the booking
    const booking = await createBooking({
      propertyId: estimate.propertyId,
      packageId: estimate.packageId || null,
      customerName: targetName,
      customerEmail: targetEmail,
      customerId: targetId,
      fromDate: estimate.fromDate,
      toDate: estimate.toDate,
      total: Number(estimate.total),
      paymentStatus: paymentStatus || "paid",
      estimateId: estimate.id,
      guests: estimate.guests || [],
      guestsDetails: estimate.guestsDetails || {}
    } as any);

    // Update estimate status to paid ONLY if nightly stay
    if (!isHourly) {
      await updateEstimateStatus(estimateId, "paid");
    }

    // Trigger email notification asynchronously
    try {
      sendBookingConfirmationEmail(booking).catch((err) => {
        console.error("[confirm route] Error in sendBookingConfirmationEmail promise:", err);
      });
    } catch (err) {
      console.warn("[confirm route] Failed to trigger sendBookingConfirmationEmail:", err);
    }

    return NextResponse.json({ success: true, booking, message: "Booking confirmed successfully!" }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/bookings/confirm error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
