import { serverEnv } from "@/lib/config/env";

const JSON_HEADERS = {
  "Content-Type": "application/json"
};

function requirePayPalConfig() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE } = serverEnv;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_API_BASE) {
    throw new Error("PayPal is not configured.");
  }
  return { clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET, apiBase: PAYPAL_API_BASE };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, apiBase } = requirePayPalConfig();
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("PayPal OAuth response missing access token.");
  }

  return data.access_token;
}

export async function createProSubscription(params: {
  userId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string }> {
  const planId = serverEnv.PAYPAL_PLAN_ID_PRO;
  const { apiBase } = requirePayPalConfig();

  if (!planId) {
    throw new Error("PAYPAL_PLAN_ID_PRO is missing.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${apiBase}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: params.userId,
      application_context: {
        user_action: "SUBSCRIBE_NOW",
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PayPal create subscription failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
  };

  const approveUrl = data.links?.find((link) => link.rel === "approve")?.href;
  if (!data.id || !approveUrl) {
    throw new Error("PayPal subscription response missing approval link.");
  }

  return { id: data.id, approveUrl };
}

export async function verifyWebhookSignature(params: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = serverEnv.PAYPAL_WEBHOOK_ID;
  const { apiBase } = requirePayPalConfig();

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is missing.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      auth_algo: params.headers.get("paypal-auth-algo"),
      cert_url: params.headers.get("paypal-cert-url"),
      transmission_id: params.headers.get("paypal-transmission-id"),
      transmission_sig: params.headers.get("paypal-transmission-sig"),
      transmission_time: params.headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(params.rawBody)
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

export function mapPayPalStatus(input?: string): "active" | "cancelled" | "expired" | "past_due" | "inactive" {
  switch (input?.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "SUSPENDED":
      return "past_due";
    default:
      return "inactive";
  }
}
