import { getProperty, getUserProfile } from "./firebase";

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function sendBookingConfirmationEmail(booking: {
  id: string;
  propertyId: string;
  packageId: string | null;
  customerName: string;
  customerEmail: string;
  fromDate: string;
  toDate: string;
  total: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] RESEND_API_KEY is not defined in environment.");
    return false;
  }

  try {
    const property = await getProperty(booking.propertyId);
    const hostId = property?.hostId || "mock_admin_example_com";
    const hostProfile = await getUserProfile(hostId);
    
    let hostEmail = "";
    
    const HOST_MAP: Record<string, string> = {
      "I8cgAm2UQddZM7cAfT74cmsxunj1": "surfyogacommunity@icloud.com",
      "cE63u7tstuREl9Kjy9YPhTnEI513": "thankyou.digital@gmail.com",
      "mock_thankyou_digital_gmail_com": "thankyou.digital@gmail.com",
      "mock_jmaclachlan_gmail_com": "jmaclachlan@gmail.com",
      "mock_admin_example_com": "jamesmac@gmail.com"
    };

    if (HOST_MAP[hostId]) {
      hostEmail = HOST_MAP[hostId];
    } else if (hostId.startsWith("mock_")) {
      const clean = hostId.substring(5);
      if (clean.endsWith("_gmail_com")) {
        hostEmail = `${clean.substring(0, clean.length - 10).replace(/_/g, ".")}@gmail.com`;
      } else if (clean.endsWith("_co_za")) {
        hostEmail = `${clean.substring(0, clean.length - 6).replace(/_/g, ".")}@co.za`;
      } else {
        hostEmail = `${clean.replace(/_/g, ".")}@gmail.com`;
      }
    } else {
      if (hostProfile?.email) {
        hostEmail = hostProfile.email;
      } else {
        try {
          const { getAuth } = require("firebase-admin/auth");
          const auth = getAuth();
          const userRecord = await auth.getUser(hostId);
          if (userRecord && userRecord.email) {
            hostEmail = userRecord.email;
          }
        } catch (err) {
          console.warn("[Resend] Auth lookup fallback failed for hostId:", hostId, err);
        }
      }
    }

    if (!hostEmail) {
      hostEmail = "jamesmac@gmail.com";
    }

    const customerEmail = booking.customerEmail;

    const start = new Date(booking.fromDate);
    const end = new Date(booking.toDate);
    const isHourly = property?.bookingType === "hourly";

    if (!isHourly) {
      start.setHours(14, 0, 0, 0);
      end.setHours(10, 0, 0, 0);
    }

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Simpleplek//Stay Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@simpleplek.co.za`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:Stay Booking - ${property?.title || "Simpleplek Stay"}`,
      `DESCRIPTION:Booking Reference: ${booking.id}\\nCustomer Name: ${booking.customerName}\\nPackage: ${booking.packageId || "Standard Stay"}\\nProperty: ${property?.title || "Stay"}\\nTotal Paid: R ${booking.total}`,
      `LOCATION:${property?.location || property?.title || "Llandudno"}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const base64Ics = Buffer.from(icsContent).toString("base64");

    const subject = `Booking Paid & Confirmed - ${property?.title || "Stay"}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0d9488; margin-top: 0;">Stay Booking Confirmed!</h2>
        <p>Hi <strong>${booking.customerName}</strong>,</p>
        <p>Your payment has been successfully processed, and your stay is confirmed.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Property:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">${property?.title || "Stay"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Booking ID:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; font-family: monospace;">${booking.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">From:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">${start.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">To:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">${end.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Package:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.packageId || "Standard Stay"}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 10px 0 0 0; font-weight: bold;">Amount Paid:</td>
              <td style="padding: 10px 0 0 0; font-weight: bold; text-align: right; color: #0d9488; font-size: 16px;">R ${booking.total.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <p>A calendar event file (.ics) has been attached to this email. You can open it to add this reservation to your calendar.</p>
        <p>Regards,<br/><strong>Simpleplek Team</strong></p>
      </div>
    `;

    // Send to BOTH host (pro) and customer (guest)
    const recipients = Array.from(new Set([customerEmail, hostEmail])).filter(Boolean) as string[];

    console.log(`[Resend] Sending confirmation email to ${recipients.join(", ")}...`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM_ADDRESS || "Simpleplek <noreply@simpleplek.co.za>",
        to: recipients,
        subject: subject,
        html: emailHtml,
        attachments: [
          {
            filename: "invite.ics",
            content: base64Ics
          }
        ]
      })
    });

    const responseData = await res.json();
    if (res.ok) {
      console.log(`[Resend] Confirmation email sent successfully. ID: ${responseData.id}`);
      return true;
    } else {
      console.error("[Resend] Failed to send email via API:", responseData);
      return false;
    }
  } catch (error) {
    console.error("[Resend] Error in sendBookingConfirmationEmail:", error);
    return false;
  }
}
