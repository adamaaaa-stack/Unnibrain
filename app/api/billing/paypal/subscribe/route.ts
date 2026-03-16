import { getRouteUser } from "@/lib/auth/route-user";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { publicEnv } from "@/lib/config/env";
import { badRequest, ok, unauthorized } from "@/lib/http/responses";
import { createProSubscription } from "@/lib/payments/paypal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const { user } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const entitlement = await getEntitlementsForUser(user.id);
  if (entitlement.plan === "pro") {
    return badRequest("Account already has Pro access.");
  }

  try {
    const { id, approveUrl } = await createProSubscription({
      userId: user.id,
      returnUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing?paypal=success`,
      cancelUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing?paypal=cancelled`
    });

    const admin = createSupabaseAdminClient();
    await admin.from("subscriptions").insert({
      user_id: user.id,
      provider: "paypal",
      provider_subscription_id: id,
      plan: "pro",
      status: "inactive"
    });

    return ok({ approvalUrl: approveUrl });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to start PayPal checkout.");
  }
}
