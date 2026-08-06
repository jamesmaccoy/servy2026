const CHECKOUT_URL = "https://payments.yoco.com/api/checkouts";

export interface CreateCheckoutProps {
  amountInCents: number;
  description: string;
  metadata?: Record<string, any>;
  siteUrl?: string;
}

export function parsePriceToCents(pkg: any): number {
  if (typeof pkg.amountInCents === "number" && pkg.amountInCents > 0) {
    return Math.round(pkg.amountInCents);
  }
  if (typeof pkg.amount === "number" && pkg.amount > 0) {
    return Math.round(pkg.amount);
  }
  const raw = pkg.price;
  if (raw == null || raw === "") {
    throw new Error("Package has no price field");
  }
  const normalized = String(raw).replace(/[^\d.]/g, "");
  const rands = parseFloat(normalized);
  if (!Number.isFinite(rands) || rands <= 0) {
    throw new Error("Invalid price on package document");
  }
  return Math.round(rands * 100);
}

export async function createCheckout({ amountInCents, description, metadata, siteUrl: passedSiteUrl }: CreateCheckoutProps): Promise<string> {
  const secretKey = process.env.YOCO_SEC?.trim();
  const siteUrl = (passedSiteUrl || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  console.log(`[Yoco Checkout] Initializing checkout: amount=${amountInCents}, description="${description}", keyPrefix=${secretKey ? secretKey.substring(0, 12) + "..." : "undefined"}`);

  if (!secretKey) {
    throw new Error(
      "YOCO_SEC environment variable is not configured. " +
      "Please add your Yoco secret key to environment variables (.env.local)."
    );
  }

  if (secretKey.startsWith("pk_")) {
    throw new Error(
      "YOCO_SEC must be a secret key (sk_test_... or sk_live_...), not a public key (pk_...)."
    );
  }

  const bookingId = metadata?.bookingId || "";
  const estimateId = metadata?.estimateId || "";
  const intent = metadata?.intent || "";
  const userId = metadata?.userId || "";
  const plan = metadata?.plan || "";

  let successUrl = process.env.YOCO_SUCCESS_URL;
  if (!successUrl) {
    if (intent === "subscription" && userId) {
      successUrl = `${siteUrl}/?payment=success&intent=subscription&userId=${userId}&plan=${plan}`;
    } else {
      successUrl = `${siteUrl}/?payment=success${bookingId ? `&bookingId=${bookingId}` : ""}${estimateId ? `&estimateId=${estimateId}` : ""}`;
    }
  }

  const cancelUrl = process.env.YOCO_CANCEL_URL || `${siteUrl}/?payment=cancel${bookingId ? `&bookingId=${bookingId}` : ""}${estimateId ? `&estimateId=${estimateId}` : ""}`;
  const failureUrl = process.env.YOCO_FAILURE_URL || `${siteUrl}/?payment=failed${bookingId ? `&bookingId=${bookingId}` : ""}${estimateId ? `&estimateId=${estimateId}` : ""}`;

  const body = {
    amount: amountInCents,
    currency: "ZAR",
    description: description,
    metadata: metadata || {},
    successUrl: successUrl,
    cancelUrl: cancelUrl,
    failureUrl: failureUrl,
  };

  const response = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.error?.message || JSON.stringify(data);
    throw new Error(`Yoco checkout failed (${response.status}): ${message}`);
  }

  const redirectUrl = data.redirectUrl || data.redirect_url;
  if (!redirectUrl) {
    throw new Error("Yoco did not return a redirectUrl");
  }

  return redirectUrl;
}
