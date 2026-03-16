import Link from "next/link";

import { signUpWithPasswordAction } from "@/features/auth/actions";

type SearchParams = {
  error?: string;
};

export default function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Create your UniBrain account</h1>
        <p className="text-sm text-slate-600">Start free with 3 course generations per month.</p>
      </header>

      {searchParams.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</p>
      ) : null}

      <form action={signUpWithPasswordAction} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Full name (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-[var(--brand)]"
            name="fullName"
            type="text"
            autoComplete="name"
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95">
          Create Account
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-[var(--brand)] hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
