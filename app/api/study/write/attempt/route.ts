import { getRouteUser } from "@/lib/auth/route-user";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { submitWriteAttemptSchema } from "@/schemas/api/study";

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const json = await request.json().catch(() => null);
  const parsed = submitWriteAttemptSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid write attempt payload.");
  }

  const { data: course } = await supabase.from("courses").select("id,user_id").eq("id", parsed.data.courseId).maybeSingle();
  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

  const { error } = await supabase.from("write_attempts").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    flashcard_id: parsed.data.flashcardId,
    prompt: parsed.data.prompt,
    answer: parsed.data.answer,
    correct_answer: parsed.data.correctAnswer,
    self_score: parsed.data.selfScore ?? null
  });

  if (error) {
    return badRequest(error.message);
  }

  return ok({ saved: true });
}
