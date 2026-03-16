import Link from "next/link";
import { notFound } from "next/navigation";

import { PaywallModal } from "@/components/paywall/paywall-modal";
import { BrainDumpMode } from "@/features/brain-dump/brain-dump-mode";
import { SpeechRubricMode } from "@/features/speech-rubric/speech-rubric-mode";
import { TutorMode } from "@/features/tutor/tutor-mode";
import { requireUser } from "@/lib/auth/session";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStudyModeSlug, STUDY_MODE_META, STUDY_MODE_ORDER, type StudyModeSlug } from "@/features/courses/modes";
import { loadCourseStudyPackage } from "@/features/study-modes/load-study-package";
import {
  FlashcardsMode,
  GuideMode,
  LearnMode,
  MatchMode,
  PracticeMode,
  QuizMode,
  SummaryMode,
  TermsMode,
  TipsMode,
  WriteMode
} from "@/features/study-modes/modes";

const SPECIAL_MODES = new Set(["brain-dump", "speech-rubric", "tutor"]);

function renderStudyMode(mode: StudyModeSlug, courseId: string, pkg: Awaited<ReturnType<typeof loadCourseStudyPackage>>) {
  switch (mode) {
    case "summary":
      return <SummaryMode summary={pkg.summary} />;
    case "guide":
      return <GuideMode sections={pkg.guideSections} />;
    case "terms":
      return <TermsMode terms={pkg.terms} />;
    case "flashcards":
      return <FlashcardsMode flashcards={pkg.flashcards} />;
    case "learn":
      return <LearnMode courseId={courseId} flashcards={pkg.flashcards} initialProgress={pkg.learnProgress} />;
    case "write":
      return <WriteMode courseId={courseId} flashcards={pkg.flashcards} />;
    case "match":
      return <MatchMode courseId={courseId} flashcards={pkg.flashcards} />;
    case "quiz":
      return <QuizMode courseId={courseId} questions={pkg.quizQuestions} />;
    case "practice":
      return <PracticeMode questions={pkg.practiceQuestions} />;
    case "tips":
      return <TipsMode tips={pkg.tips} />;
  }
}

type Params = {
  courseId: string;
  mode: string;
};

export default async function CourseModePage({ params }: { params: Params }) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();
  const entitlement = await getEntitlementsForUser(user.id);

  const { data: course } = await supabase
    .from("courses")
    .select("id,user_id,title")
    .eq("id", params.courseId)
    .maybeSingle();

  if (!course || course.user_id !== user.id) {
    notFound();
  }

  const slug = params.mode;
  const isStudyMode = isStudyModeSlug(slug);
  const isSpecialMode = SPECIAL_MODES.has(slug);
  if (!isStudyMode && !isSpecialMode) {
    notFound();
  }

  if (isSpecialMode) {
    const label = slug === "brain-dump" ? "Brain Dump" : slug === "speech-rubric" ? "Speech Rubric" : "AI Tutor";
    const blocked = entitlement.plan === "free";

    if (slug === "brain-dump" && entitlement.canUseBrainDump) {
      const { data: sessionRows } = await supabase
        .from("brain_dump_sessions")
        .select("id,created_at,score,feedback")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      const initialSessions = (sessionRows ?? []).map((row) => ({
        id: String(row.id),
        createdAt: String(row.created_at),
        score: Number(row.score ?? 0),
        feedback: String(row.feedback ?? "").split("\n\nNext revision targets:")[0] ?? ""
      }));

      return (
        <section className="space-y-4 pb-8">
          <div className="card-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{course.title}</p>
            <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">{label}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Speak everything you remember, then get grounded feedback on what you covered, partially covered, and missed.
            </p>
          </div>

          <BrainDumpMode courseId={course.id} initialSessions={initialSessions} />

          <Link href={`/courses/${course.id}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Back to Study Hub
          </Link>
        </section>
      );
    }

    if (slug === "speech-rubric" && entitlement.canUseSpeechRubric) {
      const { data: sessionRows } = await supabase
        .from("speech_rubric_sessions")
        .select("id,title,created_at,content_score,clarity_score,structure_score,confidence_score")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      const initialSessions = (sessionRows ?? []).map((row) => ({
        id: String(row.id),
        title: row.title ? String(row.title) : null,
        createdAt: String(row.created_at),
        contentScore: Number(row.content_score ?? 0),
        clarityScore: Number(row.clarity_score ?? 0),
        structureScore: Number(row.structure_score ?? 0),
        confidenceScore: Number(row.confidence_score ?? 0)
      }));

      return (
        <section className="space-y-4 pb-8">
          <div className="card-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{course.title}</p>
            <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">{label}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Record an explanation, then score your speaking on content, clarity, structure, confidence, pacing, and filler words.
            </p>
          </div>

          <SpeechRubricMode courseId={course.id} courseTitle={course.title} initialSessions={initialSessions} />

          <Link href={`/courses/${course.id}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Back to Study Hub
          </Link>
        </section>
      );
    }

    if (slug === "tutor" && entitlement.canUseTutor) {
      const { data: messageRows } = await supabase
        .from("tutor_messages")
        .select("id,role,content,created_at")
        .eq("course_id", course.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);

      const initialMessages = (messageRows ?? [])
        .slice()
        .reverse()
        .map((row) => ({
          id: String(row.id),
          role: row.role as "user" | "assistant" | "system",
          content: String(row.content ?? ""),
          createdAt: String(row.created_at)
        }));

      return (
        <section className="space-y-4 pb-8">
          <div className="card-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{course.title}</p>
            <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">{label}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ask course-specific questions and get grounded explanations, comparisons, mnemonics, and quiz-style follow-ups.
            </p>
          </div>

          <TutorMode courseId={course.id} initialMessages={initialMessages} />

          <Link href={`/courses/${course.id}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Back to Study Hub
          </Link>
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <div className="card-surface p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{course.title}</p>
          <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">{label}</h1>
          <p className="mt-2 text-sm text-slate-600">This mode is available on UniBrain Pro.</p>
          {blocked ? (
            <div className="mt-4 flex items-center gap-3">
              <p className="text-sm text-slate-700">This feature is available on UniBrain Pro.</p>
              <PaywallModal featureName={label} />
            </div>
          ) : null}
        </div>

        <Link href={`/courses/${course.id}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Back to Study Hub
        </Link>
      </section>
    );
  }

  const pkg = await loadCourseStudyPackage(course.id);
  const mode = slug as StudyModeSlug;

  return (
    <section className="space-y-4">
      <div className="card-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{course.title}</p>
        <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold text-slate-900">{STUDY_MODE_META[mode].label}</h1>
        <p className="mt-2 text-sm text-slate-600">{STUDY_MODE_META[mode].shortDescription}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {STUDY_MODE_ORDER.map((item) => (
            <Link
              key={item}
              href={`/courses/${course.id}/${item}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                item === mode ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {STUDY_MODE_META[item].label}
            </Link>
          ))}
        </div>
      </div>

      {renderStudyMode(mode, course.id, pkg)}

      <Link href={`/courses/${course.id}`} className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
        Back to Study Hub
      </Link>
    </section>
  );
}
