import { SubscribeButton } from "@/components/billing/subscribe-button";
import { requireUser } from "@/lib/auth/session";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { serverEnv } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();
  const paymentsEnabled = serverEnv.PAYMENTS_ENABLED === "true";

  const [entitlement, { data: subscription }] = await Promise.all([
    getEntitlementsForUser(user.id),
    paymentsEnabled
      ? supabase
          .from("subscriptions")
          .select("provider,plan,status,current_period_end,cancel_at_period_end")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  return (
    <div className="space-y-5">
      <section className="card-surface p-5 sm:p-6">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          {paymentsEnabled
            ? "Free: 3 generations/month. Pro: $6.99/month unlimited + premium features."
            : "Payments are disabled for testing. All accounts have Pro access."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Current plan</h2>
          <p className="mt-2 text-sm text-slate-700">Plan: {entitlement.plan.toUpperCase()}</p>
          <p className="text-sm text-slate-700">Status: {subscription?.status ?? "inactive"}</p>
          {subscription?.current_period_end ? (
            <p className="text-sm text-slate-700">Period end: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          ) : null}
          {subscription?.cancel_at_period_end ? (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-700">Cancellation scheduled at period end.</p>
          ) : null}
        </div>
        <div className="card-surface p-5">
          {paymentsEnabled ? (
            <>
              <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Upgrade</h2>
              <p className="mt-2 text-sm text-slate-600">
                PayPal subscription checkout opens in a secure redirect. Entitlements update through webhooks.
              </p>
              <div className="mt-4">
                {entitlement.plan === "free" ? (
                  <SubscribeButton />
                ) : (
                  <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Your account has Pro access.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Testing Mode</h2>
              <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                Billing checkout and webhooks are disabled. Pro features are unlocked for all users.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
