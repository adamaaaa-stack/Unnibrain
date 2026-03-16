import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "course-sources";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureCourseSourcesBucket(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: bucket } = await admin.storage.getBucket(BUCKET);
  if (bucket) {
    return;
  }

  await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024
  });
}

export async function uploadCourseSourceFile(params: {
  userId: string;
  courseId: string;
  fileName: string;
  contentType: string;
  data: Buffer;
}): Promise<{ storagePath: string; publicUrl: string | null }> {
  const admin = createSupabaseAdminClient();
  const timestamp = Date.now();
  const storagePath = `${params.userId}/${params.courseId}/${timestamp}-${safeFileName(params.fileName)}`;

  const { error } = await admin.storage.from(BUCKET).upload(storagePath, params.data, {
    contentType: params.contentType,
    upsert: false
  });

  if (error) {
    throw new Error(`Failed uploading "${params.fileName}": ${error.message}`);
  }

  const { data: signedData, error: signedError } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 30);
  if (signedError) {
    return { storagePath, publicUrl: null };
  }

  return { storagePath, publicUrl: signedData.signedUrl };
}
