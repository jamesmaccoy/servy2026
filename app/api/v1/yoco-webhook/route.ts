import { NextRequest, NextResponse } from "next/server";
import { updateBookingStatus, getEstimate, updateEstimateStatus, createBooking, listBookings, promoteUserToAdmin, getProperty } from "@/lib/firebase";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log("[Yoco Webhook] Received webhook payload:", JSON.stringify(body, null, 2));

    const eventType = body.type || body.event;
    const payload = body.payload || body;
    const metadata = payload.metadata || {};
    
    // Defensive extraction of booking ID, estimate ID & subscription details
    const bookingId = metadata.bookingId || payload.bookingId || body.bookingId;
    const estimateId = metadata.estimateId || payload.estimateId || body.estimateId;
    const intent = metadata.intent || payload.intent || body.intent;
    const userId = metadata.userId || payload.userId || body.userId;
    const customerEmail = metadata.email;
    const customerName = metadata.name;

    if (intent === "subscription" && userId) {
      if (eventType === "payment.succeeded" || eventType === "checkout.succeeded" || eventType === "charge.succeeded") {
        const plan = metadata.plan || "standard";
        console.log(`[Yoco Webhook] Subscription payment succeeded for user ${userId} with plan ${plan}. Promoting.`);
        await promoteUserToAdmin(userId, plan);
      }
      return NextResponse.json({ success: true, message: "Subscription processed successfully." });
    }

    if (!bookingId && !estimateId) {
      console.warn("[Yoco Webhook] No bookingId, estimateId, or subscription intent found in webhook payload.");
      return NextResponse.json({ success: true, message: "Webhook received, but no action identifier was found." });
    }

    if (eventType === "payment.succeeded" || eventType === "checkout.succeeded" || eventType === "charge.succeeded") {
      if (bookingId) {
        console.log(`[Yoco Webhook] Payment succeeded for booking ${bookingId}`);
        await updateBookingStatus(bookingId, "paid");
      } else if (estimateId) {
        console.log(`[Yoco Webhook] Payment succeeded for estimate ${estimateId}. Creating booking.`);
        const estimate = await getEstimate(estimateId);
        if (estimate) {
          const property = await getProperty(estimate.propertyId);
          const isHourly = property?.bookingType === "hourly";
          
          const targetEmail = customerEmail || estimate.customerEmail;
          const targetId = userId || estimate.customerId;
          const targetName = customerName || estimate.customerName;

          const existingBookings = await listBookings();
          const alreadyExists = existingBookings.some((b: any) => {
            if (isHourly) {
              return b.estimateId === estimateId && (b.customerEmail === targetEmail || b.customerId === targetId);
            } else {
              return b.estimateId === estimateId;
            }
          });

          if (!alreadyExists) {
            const booking = await createBooking({
              propertyId: estimate.propertyId,
              packageId: estimate.packageId || null,
              customerName: targetName,
              customerEmail: targetEmail,
              customerId: targetId,
              fromDate: estimate.fromDate,
              toDate: estimate.toDate,
              total: Number(estimate.total),
              paymentStatus: "paid",
              estimateId: estimate.id,
              guests: estimate.guests || [],
              guestsDetails: estimate.guestsDetails || {}
            } as any);
            
            if (!isHourly) {
              await updateEstimateStatus(estimateId, "paid");
            }

            // Trigger email notification asynchronously
            try {
              sendBookingConfirmationEmail(booking).catch((err) => {
                console.error("[Yoco Webhook] Error in sendBookingConfirmationEmail promise:", err);
              });
            } catch (err) {
              console.warn("[Yoco Webhook] Failed to trigger sendBookingConfirmationEmail:", err);
            }
            
            console.log(`[Yoco Webhook] Booking created successfully from estimate ${estimateId}`);
          } else {
            console.log(`[Yoco Webhook] Booking already exists for estimate ${estimateId}`);
          }
        } else {
          console.warn(`[Yoco Webhook] Estimate ${estimateId} not found.`);
        }
      }
    } else if (eventType === "payment.failed" || eventType === "checkout.failed" || eventType === "charge.failed") {
      if (bookingId) {
        console.log(`[Yoco Webhook] Payment failed for booking ${bookingId}`);
        await updateBookingStatus(bookingId, "failed");
      } else if (estimateId) {
        console.log(`[Yoco Webhook] Payment failed for estimate ${estimateId}`);
        await updateEstimateStatus(estimateId, "failed");
      }
    } else {
      console.log(`[Yoco Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Yoco Webhook] Error processing webhook:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

