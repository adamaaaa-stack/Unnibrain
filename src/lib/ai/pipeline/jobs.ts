import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function resolveGenerationJobId(params: {
  userId: string;
  courseId: string;
  providedJobId?: string;
}): Promise<string> {
  const admin = createSupabaseAdminClient();

  if (params.providedJobId) {
    const { data: existing } = await admin
      .from("generation_jobs")
      .select("id")
      .eq("id", params.providedJobId)
      .eq("user_id", params.userId)
      .eq("course_id", params.courseId)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }
  }

  const { data: queued } = await admin
    .from("generation_jobs")
    .select("id")
    .eq("user_id", params.userId)
    .eq("course_id", params.courseId)
    .eq("job_type", "full_course")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (queued?.id) {
    return queued.id;
  }

  const id = crypto.randomUUID();
  const { error } = await admin.from("generation_jobs").insert({
    id,
    user_id: params.userId,
    course_id: params.courseId,
    status: "queued",
    job_type: "full_course"
  });

  if (error) {
    throw new Error(`Failed creating generation job: ${error.message}`);
  }

  return id;
}

export async function markGenerationJobRunning(jobId: string, inputHash: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      completed_at: null,
      input_hash: inputHash,
      error_message: null
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed updating generation job to running: ${error.message}`);
  }
}

export async function markGenerationJobComplete(jobId: string, metadata: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata_json: metadata,
      error_message: null
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed completing generation job: ${error.message}`);
  }
}

export async function markGenerationJobFailed(jobId: string, errorMessage: string, metadata: Record<string, unknown>) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("generation_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, 1000),
      metadata_json: metadata
    })
    .eq("id", jobId);
}
