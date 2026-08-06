import { NextRequest, NextResponse } from "next/server";
import { getPackage } from "@/lib/firebase";

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
  const type = searchParams.get("type");

  if (!type) {
    return NextResponse.json(
      { status: false, data: "Type required" },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const pkg = await getPackage(type);
    if (!pkg) {
      return NextResponse.json(
        { status: false, data: `No package found for type: ${type}` },
        { status: 404, headers: corsHeaders() }
      );
    }
    return NextResponse.json(
      {
        status: true,
        data: {
          type,
          price: pkg.price ?? null,
          title: pkg.title ?? pkg.name ?? pkg.description ?? null,
          description: pkg.description ?? null,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error("get_package error:", err);
    return NextResponse.json(
      { status: false, data: err.message || "Failed to load package" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type;

    if (!type) {
      return NextResponse.json(
        { status: false, data: "Type required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const pkg = await getPackage(type);
    if (!pkg) {
      return NextResponse.json(
        { status: false, data: `No package found for type: ${type}` },
        { status: 404, headers: corsHeaders() }
      );
    }
    return NextResponse.json(
      {
        status: true,
        data: {
          type,
          price: pkg.price ?? null,
          title: pkg.title ?? pkg.name ?? pkg.description ?? null,
          description: pkg.description ?? null,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (err: any) {
    console.error("get_package error:", err);
    return NextResponse.json(
      { status: false, data: err.message || "Failed to load package" },
      { status: 500, headers: corsHeaders() }
    );
  }
}
