import { NextRequest, NextResponse } from "next/server";
import { getPackage, getProjectId, listPackageDocIds } from "@/lib/firebase";
import { parsePriceToCents, createCheckout } from "@/lib/yoco";

const PACKAGE_LABELS: Record<string, string> = {
  shack_stack: "Three nights - The Shack",
  book_an_entire_week: "A week at The Shack",
  long_weekend_at_the_Cottage: "Three nights - The Cottage",
  entire_week_at_the_cottage: "Seven nights - The Cottage",
  book_an_4hr_shoot: "4 hour shoot",
  camping_long_weekend: "Camping long weekend",
  outSeason: "Month by month",
  reception: "Host a reception",
  "24h_window": "24 hour window",
  ReserveOpportunity: "Reserve an opportunity",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Diagnostic Mode
  if (searchParams.get("diag") === "1") {
    try {
      const token = searchParams.get("token");
      if (!process.env.DIAG_TOKEN || token !== process.env.DIAG_TOKEN) {
        return NextResponse.json(
          { status: false, data: "Forbidden" },
          { status: 403, headers: corsHeaders() }
        );
      }
      const ids = await listPackageDocIds(25);
      const existsShackStack = (await getPackage("shack_stack")) != null;
      const existsSpaceShackStack = (await getPackage(" shack_stack")) != null;
      return NextResponse.json(
        {
          status: true,
          projectId: getProjectId(),
          packageDocIds: ids,
          exists: {
            shack_stack: existsShackStack,
            " shack_stack": existsSpaceShackStack,
          },
        },
        { headers: corsHeaders() }
      );
    } catch (err: any) {
      console.error("generate_checkout_link diag error:", err);
      return NextResponse.json(
        { status: false, data: err.message },
        { status: 500, headers: corsHeaders() }
      );
    }
  }

  const type = searchParams.get("type");
  if (!type) {
    return NextResponse.json(
      { status: false, data: "Error Occured : Type required" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const siteUrl = host ? `${proto}://${host}` : request.nextUrl.origin;

  return processGenerateRequest(type, undefined, undefined, undefined, undefined, siteUrl);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type;

    if (!type) {
      return NextResponse.json(
        { status: false, data: "Error Occured : Type required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const bookingId = body.bookingId;
    const estimateId = body.estimateId;
    const amountInCentsOverride = body.amountInCentsOverride;
    const descriptionOverride = body.descriptionOverride;

    const host = request.headers.get("host") || "";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const siteUrl = host ? `${proto}://${host}` : request.nextUrl.origin;

    return processGenerateRequest(type, bookingId, estimateId, amountInCentsOverride, descriptionOverride, siteUrl);
  } catch (err: any) {
    console.error("generate_checkout_link post parsing error:", err);
    return NextResponse.json(
      { status: false, data: err.message || "Failed to parse request" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

async function processGenerateRequest(
  type: string,
  bookingId?: string,
  estimateId?: string,
  amountInCentsOverride?: number,
  descriptionOverride?: string,
  siteUrl?: string
) {
  try {
    let pkg = await getPackage(type);
    if (!pkg) {
      if (amountInCentsOverride !== undefined) {
        pkg = {
          id: type,
          name: descriptionOverride || "Standard Stay",
          price: amountInCentsOverride / 100,
          multiplier: 1.0,
          baseRate: 0,
          category: "standard"
        };
      } else {
        return NextResponse.json(
          {
            status: false,
            data: `No package found for type: ${type}`,
            projectId: getProjectId(),
          },
          { status: 404, headers: corsHeaders() }
        );
      }
    }

    const amountInCents = amountInCentsOverride !== undefined ? amountInCentsOverride : parsePriceToCents(pkg);
    const description = descriptionOverride !== undefined ? descriptionOverride : (
      pkg.description || pkg.name || pkg.title || PACKAGE_LABELS[type.trim()] || type
    );

    const redirectUrl = await createCheckout({
      amountInCents,
      description,
      metadata: {
        packageType: type,
        bookingId: bookingId || "",
        estimateId: estimateId || ""
      },
      siteUrl
    });

    return NextResponse.json(
      { status: true, data: { redirectUrl } },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error("generate_checkout_link execution error:", err);
    return NextResponse.json(
      {
        status: false,
        data: err.message || "Checkout could not be created",
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

