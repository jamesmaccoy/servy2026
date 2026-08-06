import { NextRequest, NextResponse } from "next/server";
import { createBooking, listBookings, getProperty, updateBookingStatus } from "@/lib/firebase";

// In-memory cache for external feeds keyed by URL to support multiple properties
interface CacheEntry {
  timestamp: number;
  events: any[];
}

const calendarCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch calendar: ${res.statusText}`);
  }
  return res.text();
}

function parseICS(icsText: string, source: string): any[] {
  const events: any[] = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent: any = {};
  let insideEvent = false;

  for (let line of lines) {
    line = line.trim();
    if (line === "BEGIN:VEVENT") {
      insideEvent = true;
      currentEvent = {};
    } else if (line === "END:VEVENT") {
      if (insideEvent && currentEvent.fromDate && currentEvent.toDate) {
        events.push({
          id: currentEvent.id || `${source}-${Math.random().toString(36).substring(2, 9)}`,
          propertyId: "shack", // Mapped to active property dynamically later
          packageId: null,
          customerName: currentEvent.summary || (source === "gcal" ? "Google Calendar" : "Airbnb"),
          customerEmail: "",
          fromDate: currentEvent.fromDate,
          toDate: currentEvent.toDate,
          total: 0,
          paymentStatus: "paid", // Mapped to paid to block availability check
          source
        });
      }
      insideEvent = false;
    } else if (insideEvent) {
      if (line.startsWith("DTSTART")) {
        const match = line.match(/(?:DTSTART[^:]*):(\d{8})(?:T(\d{6})Z?)?/);
        if (match) {
          const dateStr = match[1];
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          currentEvent.fromDate = `${year}-${month}-${day}T00:00:00.000Z`;
        }
      } else if (line.startsWith("DTEND")) {
        const match = line.match(/(?:DTEND[^:]*):(\d{8})(?:T(\d{6})Z?)?/);
        if (match) {
          const dateStr = match[1];
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          currentEvent.toDate = `${year}-${month}-${day}T00:00:00.000Z`;
        }
      } else if (line.startsWith("SUMMARY")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          currentEvent.summary = line.substring(colonIndex + 1).replace(/\\,/g, ",").replace(/\\;/g, ";");
        }
      } else if (line.startsWith("UID")) {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          currentEvent.id = line.substring(colonIndex + 1);
        }
      }
    }
  }
  return events;
}

async function getExternalEvents(propertyId?: string): Promise<any[]> {
  // Default fallbacks from the prompt
  let gcalUrl = "https://calendar.google.com/calendar/ical/thankyou.digital%40gmail.com/public/basic.ics";
  let airbnbUrl = "https://www.airbnb.co.za/calendar/ical/1667386340564933279.ics?t=7c5748bff23743a9b22d1c04b63ed656";

  // If we have a propertyId, load its custom URLs from the database
  if (propertyId) {
    try {
      const prop = await getProperty(propertyId);
      if (prop) {
        if (prop.googleCalendarUrl !== undefined && prop.googleCalendarUrl !== null) {
          gcalUrl = prop.googleCalendarUrl;
        }
        if (prop.airbnbCalendarUrl !== undefined && prop.airbnbCalendarUrl !== null) {
          airbnbUrl = prop.airbnbCalendarUrl;
        }
      }
    } catch (err) {
      console.error(`Error looking up property urls for propertyId ${propertyId}:`, err);
    }
  }

  const now = Date.now();
  let gcalEvents: any[] = [];
  let airbnbEvents: any[] = [];

  // Get Google Calendar events
  if (gcalUrl) {
    const cached = calendarCache.get(gcalUrl);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      gcalEvents = cached.events;
    } else {
      try {
        const data = await fetchUrl(gcalUrl);
        gcalEvents = parseICS(data, "gcal");
        calendarCache.set(gcalUrl, { timestamp: now, events: gcalEvents });
      } catch (err) {
        console.error(`Error fetching/parsing Google Calendar (${gcalUrl}):`, err);
        if (cached) gcalEvents = cached.events;
      }
    }
  }

  // Get Airbnb events
  if (airbnbUrl) {
    const cached = calendarCache.get(airbnbUrl);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      airbnbEvents = cached.events;
    } else {
      try {
        const data = await fetchUrl(airbnbUrl);
        airbnbEvents = parseICS(data, "airbnb");
        calendarCache.set(airbnbUrl, { timestamp: now, events: airbnbEvents });
      } catch (err) {
        console.error(`Error fetching/parsing Airbnb Calendar (${airbnbUrl}):`, err);
        if (cached) airbnbEvents = cached.events;
      }
    }
  }

  const processedGcal = gcalEvents.map(evt => ({ ...evt, propertyId: propertyId || evt.propertyId }));
  const processedAirbnb = airbnbEvents.map(evt => ({ ...evt, propertyId: propertyId || evt.propertyId }));

  return [...processedGcal, ...processedAirbnb];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || undefined;
    const bookings = await listBookings(propertyId);
    
    // Add external events matching this property
    const externalEvents = await getExternalEvents(propertyId);

    return NextResponse.json({ success: true, data: [...bookings, ...externalEvents] });
  } catch (err: any) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ success: false, data: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      propertyId,
      packageId,
      customerName,
      customerEmail,
      fromDate,
      toDate,
      total
    } = body;

    // Validation
    if (!propertyId || !customerName || !customerEmail || !fromDate || !toDate || total === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields, including total." }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ success: false, error: "Invalid check-in or check-out date." }, { status: 400 });
    }

    // 1. Conflict checking: Fetch bookings for this property + external events
    const existingBookings = await listBookings(propertyId);
    const externalEvents = await getExternalEvents(propertyId);
    
    const allBookings = [
      ...existingBookings,
      ...externalEvents
    ];

    // Check overlapping ranges: fromDate < existing.toDate && toDate > existing.fromDate
    const isOverlapping = allBookings.some((existing: any) => {
      if (existing.paymentStatus === "failed" || existing.paymentStatus === "refunded") {
        return false;
      }
      const existingStart = new Date(existing.fromDate);
      const existingEnd = new Date(existing.toDate);
      return start < existingEnd && end > existingStart;
    });

    if (isOverlapping) {
      return NextResponse.json({ success: false, error: "The selected dates conflict with an existing booking." }, { status: 400 });
    }

    // 2. Persist the Booking
    const booking = await createBooking({
      propertyId,
      packageId: packageId || null,
      customerName,
      customerEmail,
      fromDate: start.toISOString(),
      toDate: end.toISOString(),
      total: Number(total),
      paymentStatus: "pending"
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { bookingId, paymentStatus } = body;

    if (!bookingId || !paymentStatus) {
      return NextResponse.json(
        { success: false, error: "bookingId and paymentStatus are required." },
        { status: 400 }
      );
    }

    const updated = await updateBookingStatus(bookingId, paymentStatus);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Booking with ID ${bookingId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: `Booking status updated to ${paymentStatus}.` });
  } catch (error: any) {
    console.error("PATCH /api/bookings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


