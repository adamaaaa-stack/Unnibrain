import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-14">
      <section className="card-surface grid gap-8 p-8 sm:grid-cols-2 sm:p-12">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            UniBrain MVP
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Upload notes. Get a full study system instantly.
          </h1>
          <p className="max-w-xl text-lg text-slate-700">
            Summary, guide, terms, flashcards, quiz, practice, and tips generated from your own material.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={user ? "/dashboard" : "/sign-up"}
              className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {user ? "Open Dashboard" : "Start Free"}
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign In
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
          <h2 className="font-[var(--font-heading)] text-xl font-semibold text-slate-900">What free includes</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>3 course generations per month</li>
            <li>All 10 study modes on generated courses</li>
            <li>Mobile-first dashboard and study hub</li>
          </ul>
          <h3 className="mt-6 font-[var(--font-heading)] text-base font-semibold text-slate-900">Pro unlocks</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Unlimited generations</li>
            <li>Brain Dump and Speech Rubric</li>
            <li>Course-aware AI Tutor</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
