import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseActionsMenu } from "@/components/course/course-actions-menu";
import { RunGenerationButton } from "@/components/course/run-generation-button";
import { StudyModeGrid, type ModeAvailabilityMap } from "@/components/course/study-mode-grid";
import { FloatingTutorButton } from "@/components/tutor/floating-tutor-button";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { type StudyModeSlug, STUDY_MODE_ORDER } from "@/features/courses/modes";
import { requireUser } from "@/lib/auth/session";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TimestampedMode = {
  mode: StudyModeSlug;
  timestamp: string;
};

function toDateLabel(value: string | null | undefined): string {
  if (!value) return "Not studied yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not studied yet";
  return date.toLocaleString();
}

function pickLatestMode(entries: Array<TimestampedMode | null>): StudyModeSlug | null {
  let latest: TimestampedMode | null = null;
  for (const entry of entries) {
    if (!entry) continue;
    if (!latest || new Date(entry.timestamp).getTime() > new Date(latest.timestamp).getTime()) {
      latest = entry;
    }
  }
  return latest?.mode ?? null;
}

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const [
    { data: course },
    entitlement,
    { data: latestJob },
    summaryCount,
    guideCount,
    termsCount,
    flashcardCount,
    quizCount,
    practiceCount,
    tipsCount,
    learnProgressCount,
    quizAttemptsCount,
    writeAttemptsCount,
    matchAttemptsCount,
    { data: latestSummary },
    { data: latestGuide },
    { data: latestTerms },
    { data: latestFlashcard },
    { data: latestQuizAttempt },
    { data: latestWriteAttempt },
    { data: latestMatchAttempt },
    { data: latestLearnProgress }
  ] = await Promise.all([
    supabase.from("courses").select("id,title,status,created_at,generation_error").eq("id", params.courseId).maybeSingle(),
    getEntitlementsForUser(user.id),
    supabase
      .from("generation_jobs")
      .select("id,status,started_at,completed_at,error_message,metadata_json")
      .eq("course_id", params.courseId)
      .eq("job_type", "full_course")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("course_summaries").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("course_guides").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("course_terms").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("practice_questions").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("study_tips").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("learn_progress").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("write_attempts").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase.from("match_attempts").select("id", { count: "exact", head: true }).eq("course_id", params.courseId),
    supabase
      .from("course_summaries")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("course_guides")
      .select("updated_at")
      .eq("course_id", params.courseId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("course_terms")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("flashcards")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quiz_attempts")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("write_attempts")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("match_attempts")
      .select("created_at")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("learn_progress")
      .select("updated_at")
      .eq("course_id", params.courseId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!course) {
    notFound();
  }

  const availability: ModeAvailabilityMap = {
    summary: (summaryCount.count ?? 0) > 0,
    guide: (guideCount.count ?? 0) > 0,
    terms: (termsCount.count ?? 0) > 0,
    flashcards: (flashcardCount.count ?? 0) > 0,
    learn: (flashcardCount.count ?? 0) > 0,
    write: (flashcardCount.count ?? 0) > 0,
    match: (flashcardCount.count ?? 0) > 0,
    quiz: (quizCount.count ?? 0) > 0,
    practice: (practiceCount.count ?? 0) > 0,
    tips: (tipsCount.count ?? 0) > 0
  };

  const readyModes = STUDY_MODE_ORDER.filter((slug) => availability[slug]).length;
  const modeProgressPct = Math.round((readyModes / STUDY_MODE_ORDER.length) * 100);
  const attemptCount = (quizAttemptsCount.count ?? 0) + (writeAttemptsCount.count ?? 0) + (matchAttemptsCount.count ?? 0);
  const latestMode = pickLatestMode([
    latestSummary?.created_at ? { mode: "summary", timestamp: latestSummary.created_at } : null,
    latestGuide?.updated_at ? { mode: "guide", timestamp: latestGuide.updated_at } : null,
    latestTerms?.created_at ? { mode: "terms", timestamp: latestTerms.created_at } : null,
    latestFlashcard?.created_at ? { mode: "flashcards", timestamp: latestFlashcard.created_at } : null,
    latestQuizAttempt?.created_at ? { mode: "quiz", timestamp: latestQuizAttempt.created_at } : null,
    latestWriteAttempt?.created_at ? { mode: "write", timestamp: latestWriteAttempt.created_at } : null,
    latestMatchAttempt?.created_at ? { mode: "match", timestamp: latestMatchAttempt.created_at } : null,
    latestLearnProgress?.updated_at ? { mode: "learn", timestamp: latestLearnProgress.updated_at } : null
  ]);
  const lastStudiedTimestamp =
    latestLearnProgress?.updated_at ??
    latestQuizAttempt?.created_at ??
    latestWriteAttempt?.created_at ??
    latestMatchAttempt?.created_at ??
    latestSummary?.created_at ??
    null;

  return (
    <section className="space-y-5 pb-24">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-blue-50 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Study Hub
            </p>
            <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900 sm:text-3xl">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase">{course.status}</span>
              <span>Last studied: {toDateLabel(lastStudiedTimestamp)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <RunGenerationButton courseId={course.id} disabled={course.status === "processing"} />
            <CourseActionsMenu courseId={course.id} />
            <Link href="/dashboard" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              Back
            </Link>
          </div>
        </div>

        {course.generation_error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{course.generation_error}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode readiness</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {readyModes}/{STUDY_MODE_ORDER.length}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-[var(--brand)] transition-all" style={{ width: `${modeProgressPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{modeProgressPct}% of study modes are ready.</p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study activity</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{attemptCount}</p>
          <p className="mt-2 text-xs text-slate-500">
            Total quiz, write, and match attempts. Learn progress entries: {learnProgressCount.count ?? 0}.
          </p>
        </div>

        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generation status</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{latestJob?.status ?? "none"}</p>
          <p className="mt-2 text-xs text-slate-500">Most recent full-course job state and persistence status.</p>
        </div>
      </div>

      <div className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Study Modes</h2>
            <p className="text-sm text-slate-600">Open any mode to start revision from generated course material.</p>
          </div>
          {entitlement.plan === "free" ? (
            <PaywallModal featureName="Brain Dump, Speech Rubric, and AI Tutor" ctaLabel="Unlock Pro Modes" />
          ) : null}
        </div>
        <StudyModeGrid courseId={course.id} availability={availability} lastStudiedMode={latestMode} />
      </div>

      <div className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Pro Modes</h2>
            <p className="text-sm text-slate-600">Advanced speaking and tutoring workflows tied to this course.</p>
          </div>
          {entitlement.plan === "free" ? <PaywallModal featureName="Brain Dump, Speech Rubric, and AI Tutor" ctaLabel="Unlock Pro Modes" /> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              slug: "brain-dump",
              label: "Brain Dump",
              description: "Explain everything you remember and get concept coverage feedback.",
              enabled: entitlement.canUseBrainDump
            },
            {
              slug: "speech-rubric",
              label: "Speech Rubric",
              description: "Score clarity, structure, confidence, pacing, and filler words.",
              enabled: entitlement.canUseSpeechRubric
            },
            {
              slug: "tutor",
              label: "AI Tutor",
              description: "Course-grounded chat for explanations, quizzes, and mnemonics.",
              enabled: entitlement.canUseTutor
            }
          ].map((mode) =>
            mode.enabled ? (
              <Link
                key={mode.slug}
                href={`/courses/${course.id}/${mode.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[var(--brand)] hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-[var(--font-heading)] text-base font-semibold text-slate-900">{mode.label}</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700">Ready</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{mode.description}</p>
              </Link>
            ) : (
              <div key={mode.slug} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-[var(--font-heading)] text-base font-semibold text-slate-900">{mode.label}</h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">Pro</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{mode.description}</p>
                <div className="mt-3">
                  <PaywallModal featureName={mode.label} />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <FloatingTutorButton courseId={course.id} plan={entitlement.plan} />
    </section>
  );
}
