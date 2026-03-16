import Link from "next/link";

import { PaywallModal } from "@/components/paywall/paywall-modal";
import { requireUser } from "@/lib/auth/session";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CourseSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type WeakArea = {
  flashcardId: string;
  courseId: string;
  courseTitle: string;
  prompt: string;
  mastery: number;
  incorrectCount: number;
  updatedAt: string;
  severity: number;
};

function toDateLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function toDayKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function previousDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function computeStudyStreak(activityTimestamps: string[]): number {
  const daySet = new Set(activityTimestamps.map(toDayKey).filter((value): value is string => Boolean(value)));
  if (daySet.size === 0) return 0;

  let cursor = new Date().toISOString().slice(0, 10);
  if (!daySet.has(cursor)) {
    cursor = previousDayKey(cursor);
  }

  let streak = 0;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }

  return streak;
}

function computeActiveDaysLast30(activityTimestamps: string[]): number {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const daySet = new Set<string>();

  for (const timestamp of activityTimestamps) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime()) || date.getTime() < thirtyDaysAgo) {
      continue;
    }
    daySet.add(date.toISOString().slice(0, 10));
  }

  return daySet.size;
}

function extractMissedConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const concepts: string[] = [];

  for (const item of value) {
    if (typeof item === "string") {
      const concept = item.trim();
      if (concept) concepts.push(concept);
      continue;
    }

    if (item && typeof item === "object" && "concept" in item) {
      const concept = (item as { concept?: unknown }).concept;
      if (typeof concept === "string" && concept.trim().length > 0) {
        concepts.push(concept.trim());
      }
    }
  }

  return concepts;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const [
    entitlement,
    { data: courseRows },
    { data: quizRows },
    { data: writeRows },
    { data: matchRows },
    { data: learnRows },
    { data: brainRows },
    { data: speechRows },
    { data: tutorRows }
  ] = await Promise.all([
    getEntitlementsForUser(user.id),
    supabase
      .from("courses")
      .select("id,title,status,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(24),
    supabase
      .from("quiz_attempts")
      .select("id,course_id,score,total_questions,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("write_attempts")
      .select("id,course_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("match_attempts")
      .select("id,course_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("learn_progress")
      .select("id,course_id,flashcard_id,mastery_level,incorrect_count,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(120),
    supabase
      .from("brain_dump_sessions")
      .select("id,course_id,score,missed_json,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("speech_rubric_sessions")
      .select("id,course_id,title,content_score,clarity_score,structure_score,confidence_score,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tutor_messages")
      .select("id,course_id,role,created_at")
      .eq("user_id", user.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  const courses: CourseSummary[] = (courseRows ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));

  const courseTitleById = new Map<string, string>(courses.map((course) => [course.id, course.title]));
  const referencedCourseIds = new Set<string>();
  for (const row of quizRows ?? []) referencedCourseIds.add(String(row.course_id));
  for (const row of writeRows ?? []) referencedCourseIds.add(String(row.course_id));
  for (const row of matchRows ?? []) referencedCourseIds.add(String(row.course_id));
  for (const row of learnRows ?? []) referencedCourseIds.add(String(row.course_id));
  for (const row of brainRows ?? []) referencedCourseIds.add(String(row.course_id));
  for (const row of speechRows ?? []) {
    if (row.course_id) referencedCourseIds.add(String(row.course_id));
  }
  for (const row of tutorRows ?? []) referencedCourseIds.add(String(row.course_id));

  const missingCourseIds = [...referencedCourseIds].filter((courseId) => !courseTitleById.has(courseId));
  if (missingCourseIds.length > 0) {
    const { data: missingCourses } = await supabase
      .from("courses")
      .select("id,title")
      .eq("user_id", user.id)
      .in("id", missingCourseIds.slice(0, 100));
    for (const row of missingCourses ?? []) {
      courseTitleById.set(String(row.id), String(row.title));
    }
  }

  const allActivityTimestamps = [
    ...(quizRows ?? []).map((row) => String(row.created_at)),
    ...(writeRows ?? []).map((row) => String(row.created_at)),
    ...(matchRows ?? []).map((row) => String(row.created_at)),
    ...(learnRows ?? []).map((row) => String(row.updated_at)),
    ...(brainRows ?? []).map((row) => String(row.created_at)),
    ...(speechRows ?? []).map((row) => String(row.created_at)),
    ...(tutorRows ?? []).map((row) => String(row.created_at))
  ];
  const studyStreak = computeStudyStreak(allActivityTimestamps);
  const activeDays30 = computeActiveDaysLast30(allActivityTimestamps);

  const recentQuizRows = quizRows ?? [];
  const averageQuizScore =
    recentQuizRows.length > 0
      ? Math.round(recentQuizRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / recentQuizRows.length)
      : null;
  const quizTrend =
    recentQuizRows.length >= 2
      ? Number(recentQuizRows[0].score ?? 0) - Number(recentQuizRows[recentQuizRows.length - 1].score ?? 0)
      : null;

  const activityCandidates = [
    ...(quizRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "quiz",
      modeLabel: "Quiz",
      timestamp: String(row.created_at),
      href: `/courses/${String(row.course_id)}/quiz`
    })),
    ...(writeRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "write",
      modeLabel: "Write",
      timestamp: String(row.created_at),
      href: `/courses/${String(row.course_id)}/write`
    })),
    ...(matchRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "match",
      modeLabel: "Match",
      timestamp: String(row.created_at),
      href: `/courses/${String(row.course_id)}/match`
    })),
    ...(learnRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "learn",
      modeLabel: "Learn",
      timestamp: String(row.updated_at),
      href: `/courses/${String(row.course_id)}/learn`
    })),
    ...(brainRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "brain-dump",
      modeLabel: "Brain Dump",
      timestamp: String(row.created_at),
      href: `/courses/${String(row.course_id)}/brain-dump`
    })),
    ...(speechRows ?? [])
      .filter((row) => row.course_id)
      .map((row) => ({
        courseId: String(row.course_id),
        mode: "speech-rubric",
        modeLabel: "Speech Rubric",
        timestamp: String(row.created_at),
        href: `/courses/${String(row.course_id)}/speech-rubric`
      })),
    ...(tutorRows ?? []).map((row) => ({
      courseId: String(row.course_id),
      mode: "tutor",
      modeLabel: "Tutor",
      timestamp: String(row.created_at),
      href: `/courses/${String(row.course_id)}/tutor`
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const latestActivity = activityCandidates[0] ?? null;
  const continueHref = latestActivity ? latestActivity.href : "/courses/new";
  const continueText = latestActivity
    ? `Continue ${courseTitleById.get(latestActivity.courseId) ?? "course"} in ${latestActivity.modeLabel}`
    : "Create your first course";

  const weakRows = (learnRows ?? []).filter((row) => Number(row.mastery_level ?? 0) <= 2 || Number(row.incorrect_count ?? 0) >= 2);
  const weakFlashcardIds = [...new Set(weakRows.map((row) => String(row.flashcard_id)))];
  const { data: weakFlashcards } =
    weakFlashcardIds.length > 0
      ? await supabase
          .from("flashcards")
          .select("id,course_id,front")
          .in("id", weakFlashcardIds.slice(0, 80))
      : { data: [] };
  const flashcardById = new Map(
    (weakFlashcards ?? []).map((row) => [String(row.id), { front: String(row.front), courseId: String(row.course_id) }])
  );

  const weakAreas: WeakArea[] = [];
  const weakSeen = new Set<string>();
  for (const row of weakRows) {
    const flashcardId = String(row.flashcard_id);
    if (weakSeen.has(flashcardId)) continue;
    weakSeen.add(flashcardId);
    const flashcard = flashcardById.get(flashcardId);
    if (!flashcard) continue;

    const mastery = Number(row.mastery_level ?? 0);
    const incorrectCount = Number(row.incorrect_count ?? 0);
    const severity = (3 - Math.min(3, mastery)) * 3 + incorrectCount;
    weakAreas.push({
      flashcardId,
      courseId: flashcard.courseId,
      courseTitle: courseTitleById.get(flashcard.courseId) ?? "Course",
      prompt: flashcard.front,
      mastery,
      incorrectCount,
      updatedAt: String(row.updated_at),
      severity
    });
  }
  weakAreas.sort((a, b) => b.severity - a.severity || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const missedConceptCounts = new Map<string, number>();
  for (const row of brainRows ?? []) {
    for (const concept of extractMissedConcepts(row.missed_json)) {
      missedConceptCounts.set(concept, (missedConceptCounts.get(concept) ?? 0) + 1);
    }
  }
  const topMissedConcepts = [...missedConceptCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-6 pb-10">
      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Track momentum, weak spots, and your next best study action.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={continueHref} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              {continueText}
            </Link>
            <Link href="/courses/new" className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              Create Course
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Courses</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{courses.length}</p>
          <p className="text-sm text-slate-600">Created and tracked in your workspace.</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generation Usage</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {entitlement.generationsUsedThisMonth}
            {entitlement.generationLimitThisMonth ? `/${entitlement.generationLimitThisMonth}` : ""}
          </p>
          <p className="text-sm text-slate-600">
            Reset: {new Date(entitlement.nextResetAt).toLocaleDateString()} {entitlement.plan === "pro" ? "(unlimited)" : ""}
          </p>
          {entitlement.generationLimitThisMonth ? (
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-[var(--brand)]"
                style={{ width: `${Math.min(100, Math.round((entitlement.generationsUsedThisMonth / entitlement.generationLimitThisMonth) * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study Streak</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{studyStreak}</p>
          <p className="text-sm text-slate-600">Active days in last 30 days: {activeDays30}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiz Average</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{averageQuizScore ?? "N/A"}</p>
          <p className="text-sm text-slate-600">
            {quizTrend === null ? "Complete quizzes to unlock trend." : quizTrend >= 0 ? `Trend: +${Math.round(quizTrend)} pts` : `Trend: ${Math.round(quizTrend)} pts`}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Recent Courses</h2>
            <Link href="/courses/new" className="text-sm font-semibold text-[var(--brand)]">
              New course
            </Link>
          </div>
          {courses.length > 0 ? (
            <ul className="space-y-2">
              {courses.slice(0, 8).map((course) => (
                <li key={course.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/courses/${course.id}`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                      {course.title}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                      {course.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Updated: {toDateLabel(course.updatedAt)}</span>
                    <Link href={`/courses/${course.id}`} className="font-semibold text-[var(--brand)]">
                      Continue
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No courses yet. Start by creating your first course from notes.
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Recent Quiz Performance</h2>
          <p className="mt-1 text-sm text-slate-600">Latest attempts with course context and score trend.</p>
          {recentQuizRows.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recentQuizRows.slice(0, 7).map((row) => {
                const score = Math.round(Number(row.score ?? 0));
                const courseId = String(row.course_id);
                return (
                  <li key={String(row.id)} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={`/courses/${courseId}/quiz`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                        {courseTitleById.get(courseId) ?? "Course"}
                      </Link>
                      <span className="font-semibold text-slate-700">{score}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: `${Math.min(100, score)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {toDateLabel(String(row.created_at))} • {Number(row.total_questions ?? 0)} questions
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No quiz attempts yet. Open any course and run Quiz mode.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Weak Areas</h2>
          <p className="mt-1 text-sm text-slate-600">Detected from low mastery flashcards and high mistake counts.</p>
          {weakAreas.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {weakAreas.slice(0, 8).map((area) => (
                <li key={area.flashcardId} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/courses/${area.courseId}/learn`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                      {area.courseTitle}
                    </Link>
                    <span className="text-xs font-semibold text-slate-600">
                      Mastery {area.mastery}/5 • Misses {area.incorrectCount}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-700">{area.prompt}</p>
                  <p className="mt-1 text-xs text-slate-500">Last reviewed: {toDateLabel(area.updatedAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No clear weak cards yet. Study with Learn mode to build diagnostics.
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Missed Concepts (Brain Dump)</h2>
          <p className="mt-1 text-sm text-slate-600">Most frequently missed concepts across recent Brain Dump sessions.</p>
          {entitlement.plan === "pro" ? (
            topMissedConcepts.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {topMissedConcepts.map(([concept, count]) => (
                  <li key={concept} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="line-clamp-2 text-slate-800">{concept}</span>
                    <span className="ml-3 shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{count}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No Brain Dump misses captured yet.
              </div>
            )
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Upgrade to UniBrain Pro to unlock Brain Dump diagnostics.
              <div className="mt-3">
                <PaywallModal featureName="Brain Dump diagnostics" ctaLabel="Unlock Pro" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Pro Session Recents</h2>
            <p className="text-sm text-slate-600">Latest Brain Dump and Speech Rubric sessions.</p>
          </div>
          <p className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">{entitlement.plan}</p>
        </div>
        {entitlement.plan === "pro" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Brain Dump</h3>
              {(brainRows ?? []).length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {(brainRows ?? []).slice(0, 5).map((row) => {
                    const courseId = String(row.course_id);
                    return (
                      <li key={String(row.id)} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/courses/${courseId}/brain-dump`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                            {courseTitleById.get(courseId) ?? "Course"}
                          </Link>
                          <span className="text-xs font-semibold text-slate-600">{Math.round(Number(row.score ?? 0))}/100</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{toDateLabel(String(row.created_at))}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No Brain Dump sessions yet.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Speech Rubric</h3>
              {(speechRows ?? []).length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {(speechRows ?? []).slice(0, 5).map((row) => {
                    const courseId = row.course_id ? String(row.course_id) : null;
                    const average = Math.round(
                      (Number(row.content_score ?? 0) +
                        Number(row.clarity_score ?? 0) +
                        Number(row.structure_score ?? 0) +
                        Number(row.confidence_score ?? 0)) /
                        4
                    );
                    return (
                      <li key={String(row.id)} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          {courseId ? (
                            <Link href={`/courses/${courseId}/speech-rubric`} className="font-semibold text-slate-900 hover:text-[var(--brand)]">
                              {courseTitleById.get(courseId) ?? row.title ?? "Speech"}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-900">{row.title ?? "Speech"}</span>
                          )}
                          <span className="text-xs font-semibold text-slate-600">Avg {average}/100</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{toDateLabel(String(row.created_at))}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No Speech Rubric sessions yet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Pro sessions are available on UniBrain Pro.
            <div className="mt-3">
              <PaywallModal featureName="Brain Dump, Speech Rubric, and AI Tutor" ctaLabel="Unlock Pro" />
            </div>
          </div>
        )}
      </section>

      <section className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[var(--font-heading)] text-lg font-semibold text-slate-900">Next Best Action</h2>
            <p className="text-sm text-slate-600">Resume from your latest learning signal or start a fresh course.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={continueHref} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              {latestActivity ? "Continue Studying" : "Create First Course"}
            </Link>
            <Link href="/courses/new" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              New Course
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
