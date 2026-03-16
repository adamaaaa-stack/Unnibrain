import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { UsageMeter } from "@/components/billing/usage-meter";
import type { Entitlement } from "@/schemas/domain/entitlements";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName?: string | null;
  entitlement: Entitlement;
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses/new", label: "Create Course" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" }
];

export function AppShell({ children, userEmail, userName, entitlement }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">
              UniBrain
            </Link>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                entitlement.plan === "pro" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {entitlement.plan.toUpperCase()}
            </span>
          </div>
          <nav className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-1.5 transition hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{userName || userEmail}</span>
            <form action={signOutAction}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <div className="card-surface p-4">
            <h2 className="font-[var(--font-heading)] text-sm font-semibold text-slate-900">Plan & Usage</h2>
            <div className="mt-3">
              <UsageMeter entitlement={entitlement} />
            </div>
            {entitlement.plan === "free" ? (
              <Link
                href="/billing"
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Upgrade to Pro
              </Link>
            ) : null}
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
