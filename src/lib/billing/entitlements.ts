import { FREE_MONTHLY_COURSE_LIMIT } from "@/lib/billing/constants";
import { serverEnv } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthKey, getNextMonthResetIso } from "@/lib/usage/month";
import { entitlementSchema, type Entitlement } from "@/schemas/domain/entitlements";

export async function getEntitlementsForUser(userId: string): Promise<Entitlement> {
  const paymentsEnabled = serverEnv.PAYMENTS_ENABLED === "true";
  if (!paymentsEnabled) {
    return entitlementSchema.parse({
      plan: "pro",
      canGenerateCourse: true,
      generationsUsedThisMonth: 0,
      generationLimitThisMonth: null,
      canUseBrainDump: true,
      canUseSpeechRubric: true,
      canUseTutor: true,
      nextResetAt: getNextMonthResetIso()
    });
  }

  const supabase = createSupabaseServerClient();
  const monthKey = getMonthKey();

  const [{ data: sub }, { data: usage }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("usage_counters")
      .select("course_generations_used")
      .eq("user_id", userId)
      .eq("month_key", monthKey)
      .maybeSingle()
  ]);

  const proActive = sub?.plan === "pro" && sub?.status === "active";
  const used = usage?.course_generations_used ?? 0;
  const limit = proActive ? null : FREE_MONTHLY_COURSE_LIMIT;
  const canGenerateCourse = proActive || used < FREE_MONTHLY_COURSE_LIMIT;

  return entitlementSchema.parse({
    plan: proActive ? "pro" : "free",
    canGenerateCourse,
    generationsUsedThisMonth: used,
    generationLimitThisMonth: limit,
    canUseBrainDump: proActive,
    canUseSpeechRubric: proActive,
    canUseTutor: proActive,
    nextResetAt: getNextMonthResetIso()
  });
}

export async function incrementCourseGenerationUsage(userId: string): Promise<void> {
  if (serverEnv.PAYMENTS_ENABLED !== "true") {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const monthKey = getMonthKey();

  const { data: row } = await supabase
    .from("usage_counters")
    .select("id,course_generations_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (!row) {
    const { error } = await supabase.from("usage_counters").insert({
      user_id: userId,
      month_key: monthKey,
      course_generations_used: 1
    });

    if (error) {
      throw new Error(`Failed creating usage counter: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase
    .from("usage_counters")
    .update({
      course_generations_used: row.course_generations_used + 1
    })
    .eq("id", row.id);

  if (error) {
    throw new Error(`Failed incrementing usage counter: ${error.message}`);
  }
}

export function requireFeature(entitlements: Entitlement, feature: "brainDump" | "speechRubric" | "tutor"): void {
  const allowed =
    (feature === "brainDump" && entitlements.canUseBrainDump) ||
    (feature === "speechRubric" && entitlements.canUseSpeechRubric) ||
    (feature === "tutor" && entitlements.canUseTutor);

  if (!allowed) {
    throw new Error("This feature requires UniBrain Pro.");
  }
}
