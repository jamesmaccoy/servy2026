import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    // Read binary data from the request body
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public/uploads directory
    const targetPath = path.join(process.cwd(), "public", "uploads", key);
    const targetDir = path.dirname(targetPath);

    // Ensure the folder exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(targetPath, buffer);
    console.log(`[Mock Upload] Saved file to ${targetPath}`);

    return NextResponse.json({ success: true, url: `/uploads/${key}` });
  } catch (error: any) {
    console.error("[Mock Upload] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
