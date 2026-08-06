import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper to determine if R2 is configured
const isR2Configured = () => {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_ENDPOINT &&
    (process.env.R2_BUCKET || process.env.R2_BUCKET_NAME)
  );
};

// Initialize R2 client lazily
let r2Client: S3Client | null = null;
function getR2Client() {
  if (r2Client) return r2Client;
  if (!isR2Configured()) return null;

  r2Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return r2Client;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { hostId, filename, contentType, propertyId } = body;

    if (!hostId || !filename) {
      return NextResponse.json({ error: "Missing required parameters (hostId, filename)" }, { status: 400 });
    }

    const activePropertyId = propertyId || "draft";
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `hosts/${hostId}/properties/${activePropertyId}/${Date.now()}_${cleanFilename}`;

    const client = getR2Client();

    if (!client) {
      // Local development mock fallback
      console.warn("⚠️ Cloudflare R2 credentials not fully configured in env variables. Falling back to local mock upload.");
      return NextResponse.json({
        presignedUrl: `/api/media/mock-upload?key=${encodeURIComponent(fileKey)}`,
        publicUrl: `/uploads/${fileKey}`,
        isMock: true
      });
    }

    const bucketName = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "simpleplek";
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType || "image/jpeg",
    });

    // Link valid for 15 minutes (900 seconds)
    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || `https://pub-dd60f01f0434b933614f132cee2d1e61.r2.dev`;
    const cleanPublicDomain = publicDomain.endsWith("/") ? publicDomain.slice(0, -1) : publicDomain;
    const publicUrl = `${cleanPublicDomain}/${fileKey}`;

    return NextResponse.json({ presignedUrl, publicUrl });
  } catch (error: any) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
