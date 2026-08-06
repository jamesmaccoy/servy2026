import { NextRequest, NextResponse } from "next/server";
import { getBookingByToken, addGuestToBooking } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, userId, email, name } = body;

    if (!token || !userId) {
      return NextResponse.json({ success: false, error: "Missing required fields (token, userId)" }, { status: 400 });
    }

    const booking = await getBookingByToken(token);
    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found for the provided token." }, { status: 404 });
    }

    // Add guest to booking
    const added = await addGuestToBooking(booking.id, userId, email, name);
    if (!added) {
      return NextResponse.json({ success: false, error: "Failed to join booking." }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId: booking.id, message: "Successfully joined the booking!" });
  } catch (error: any) {
    console.error("POST /api/bookings/accept-invite error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
