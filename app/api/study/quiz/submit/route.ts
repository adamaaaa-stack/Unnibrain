import { getRouteUser } from "@/lib/auth/route-user";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { submitQuizAttemptSchema } from "@/schemas/api/study";

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const json = await request.json().catch(() => null);
  const parsed = submitQuizAttemptSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid quiz attempt payload.");
  }

  const { data: course } = await supabase.from("courses").select("id,user_id").eq("id", parsed.data.courseId).maybeSingle();
  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    score: parsed.data.score,
    total_questions: parsed.data.totalQuestions,
    answers_json: parsed.data.answers
  });

  if (error) {
    return badRequest(error.message);
  }

  return ok({ saved: true });
}
