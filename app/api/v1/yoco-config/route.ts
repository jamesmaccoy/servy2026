import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.YOCO_PUB;
  if (!publicKey) {
    console.warn("⚠️ YOCO_PUB environment variable is not configured.");
  }
  return NextResponse.json({ publicKey });
}
