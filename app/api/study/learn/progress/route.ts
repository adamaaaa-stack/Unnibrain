import { getRouteUser } from "@/lib/auth/route-user";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { upsertLearnProgressSchema } from "@/schemas/api/study";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const json = await request.json().catch(() => null);
  const parsed = upsertLearnProgressSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid learn progress payload.");
  }

  const { data: course } = await supabase.from("courses").select("id,user_id").eq("id", parsed.data.courseId).maybeSingle();
  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("learn_progress")
    .select("id,mastery_level,correct_streak,incorrect_count")
    .eq("user_id", user.id)
    .eq("course_id", parsed.data.courseId)
    .eq("flashcard_id", parsed.data.flashcardId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("learn_progress").insert({
      user_id: user.id,
      course_id: parsed.data.courseId,
      flashcard_id: parsed.data.flashcardId,
      mastery_level: parsed.data.result === "correct" ? 1 : 0,
      correct_streak: parsed.data.result === "correct" ? 1 : 0,
      incorrect_count: parsed.data.result === "incorrect" ? 1 : 0,
      last_reviewed_at: now
    });

    if (error) {
      return badRequest(error.message);
    }

    return ok({
      masteryLevel: parsed.data.result === "correct" ? 1 : 0
    });
  }

  const nextMastery =
    parsed.data.result === "correct"
      ? clamp(existing.mastery_level + 1, 0, 5)
      : clamp(existing.mastery_level - 1, 0, 5);

  const { error } = await supabase
    .from("learn_progress")
    .update({
      mastery_level: nextMastery,
      correct_streak: parsed.data.result === "correct" ? existing.correct_streak + 1 : 0,
      incorrect_count: parsed.data.result === "incorrect" ? existing.incorrect_count + 1 : existing.incorrect_count,
      last_reviewed_at: now
    })
    .eq("id", existing.id);

  if (error) {
    return badRequest(error.message);
  }

  return ok({
    masteryLevel: nextMastery
  });
}
