import { getRouteUser } from "@/lib/auth/route-user";
import { runCourseGenerationPipeline } from "@/lib/ai/pipeline/generate-course";
import { resolveGenerationJobId } from "@/lib/ai/pipeline/jobs";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { badRequest, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { runGenerationRequestSchema } from "@/schemas/api/course";

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  const json = await request.json().catch(() => null);
  const parsed = runGenerationRequestSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid generation payload.");
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id,user_id,status")
    .eq("id", parsed.data.courseId)
    .maybeSingle();

  if (!course || course.user_id !== user.id) {
    return forbidden("Course not found.");
  }

  const entitlements = await getEntitlementsForUser(user.id);
  const { data: existingJob } = await supabase
    .from("generation_jobs")
    .select("id,status")
    .eq("course_id", course.id)
    .eq("job_type", "full_course")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasExistingJob = !!existingJob?.id;
  if (!entitlements.canGenerateCourse && !hasExistingJob) {
    return forbidden("Free monthly course generation limit reached. Upgrade to Pro for unlimited usage.");
  }

  try {
    const jobId = await resolveGenerationJobId({
      userId: user.id,
      courseId: course.id,
      providedJobId: parsed.data.generationJobId
    });

    const result = await runCourseGenerationPipeline({
      userId: user.id,
      courseId: course.id,
      jobId,
      forceRegenerate: parsed.data.forceRegenerate
    });

    return ok(result);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Generation failed.");
  }
}
