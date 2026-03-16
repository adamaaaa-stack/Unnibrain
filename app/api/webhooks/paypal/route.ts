import { NextResponse } from "next/server";

import { mapPayPalStatus, verifyWebhookSignature } from "@/lib/payments/paypal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    billing_info?: {
      last_payment?: { time?: string };
      next_billing_time?: string;
      cycle_executions?: Array<{ tenure_type?: string; cycles_completed?: number; cycles_remaining?: number }>;
    };
  };
};

function toStatus(eventType?: string, resourceStatus?: string) {
  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") return "active";
  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") return "cancelled";
  if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") return "expired";
  if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") return "past_due";
  return mapPayPalStatus(resourceStatus);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const verified = await verifyWebhookSignature({
    headers: request.headers,
    rawBody
  }).catch(() => false);

  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as PayPalWebhookEvent;
  const subscriptionId = event.resource?.id;

  if (!subscriptionId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const status = toStatus(event.event_type, event.resource?.status);
  const currentPeriodStart = event.resource?.billing_info?.last_payment?.time ?? null;
  const currentPeriodEnd = event.resource?.billing_info?.next_billing_time ?? null;
  const customUserId = event.resource?.custom_id ?? null;

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id,user_id")
    .eq("provider", "paypal")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("subscriptions")
      .update({
        status,
        plan: "pro",
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd
      })
      .eq("id", existing.id);

    return NextResponse.json({ ok: true, updated: true }, { status: 200 });
  }

  if (!customUserId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  await admin.from("subscriptions").insert({
    user_id: customUserId,
    provider: "paypal",
    provider_subscription_id: subscriptionId,
    plan: "pro",
    status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd
  });

  return NextResponse.json({ ok: true, inserted: true }, { status: 200 });
}
