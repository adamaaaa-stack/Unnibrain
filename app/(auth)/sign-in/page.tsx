import Link from "next/link";

import { sendMagicLinkAction, signInWithPasswordAction } from "@/features/auth/actions";

type SearchParams = {
  error?: string;
  success?: string;
  next?: string;
};

export default function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const error = searchParams.error;
  const success = searchParams.success;
  const next = searchParams.next ?? "/dashboard";

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-600">Sign in to continue your study workflow.</p>
      </header>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(error)}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{decodeURIComponent(success)}</p> : null}

      <form action={signInWithPasswordAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-[var(--brand)]"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-[var(--brand)]"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        <button className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95">
          Sign In
        </button>
      </form>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Magic Link</p>
        <form action={sendMagicLinkAction} className="flex gap-2">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Send
          </button>
        </form>
      </div>

      <p className="text-sm text-slate-600">
        New to UniBrain?{" "}
        <Link href="/sign-up" className="font-semibold text-[var(--brand)] hover:underline">
          Create account
        </Link>
      </p>
    </section>
  );
}
