import type { Entitlement } from "@/schemas/domain/entitlements";

export function UsageMeter({ entitlement }: { entitlement: Entitlement }) {
  if (entitlement.plan === "pro") {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        Pro plan: unlimited course generation
      </div>
    );
  }

  const limit = entitlement.generationLimitThisMonth ?? 0;
  const used = entitlement.generationsUsedThisMonth;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
        <span>Free plan usage</span>
        <span>
          {used}/{limit}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-amber-100">
        <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
