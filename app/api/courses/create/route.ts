import { createCourseFormFieldsSchema, createCourseRequestSchema, createCourseResponseSchema } from "@/schemas/api/course";
import { badRequest, conflict, forbidden, ok, unauthorized } from "@/lib/http/responses";
import { getRouteUser } from "@/lib/auth/route-user";
import { getEntitlementsForUser, incrementCourseGenerationUsage } from "@/lib/billing/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeSourceHash } from "@/lib/ingestion/hash";
import {
  extractFromFile,
  extractFromPastedText,
  resolveCourseSourceType,
  type ExtractedSource,
  validateFiles
} from "@/lib/ingestion/extract";
import { INGESTION_LIMITS, IMAGE_MIME_TYPES } from "@/lib/ingestion/constants";
import { normalizeExtractedText } from "@/lib/ingestion/normalize";
import { ensureCourseSourcesBucket, uploadCourseSourceFile } from "@/lib/storage/course-sources";

export const runtime = "nodejs";
export const maxDuration = 120;

type ParsedCreatePayload = {
  title: string;
  pastedText: string;
  files: File[];
  forceCreateDuplicate: boolean;
};

function toBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return value === "true" || value === "1";
}

async function parseCreateCoursePayload(request: Request): Promise<ParsedCreatePayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawTitle = formData.get("title");
    const rawPastedText = formData.get("pastedText");
    const rawForceCreateDuplicate = formData.get("forceCreateDuplicate");
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => typeof File !== "undefined" && entry instanceof File);

    const parsedFields = createCourseFormFieldsSchema.safeParse({
      title: typeof rawTitle === "string" ? rawTitle : "",
      pastedText: typeof rawPastedText === "string" ? rawPastedText : "",
      forceCreateDuplicate: toBoolean(rawForceCreateDuplicate)
    });

    if (!parsedFields.success) {
      throw new Error("Invalid course form payload.");
    }

    return {
      title: parsedFields.data.title.trim(),
      pastedText: (parsedFields.data.pastedText ?? "").trim(),
      files,
      forceCreateDuplicate: parsedFields.data.forceCreateDuplicate
    };
  }

  const json = await request.json().catch(() => null);
  const parsed = createCourseRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid create-course payload.");
  }

  return {
    title: parsed.data.title.trim(),
    pastedText: (parsed.data.pastedText ?? "").trim(),
    files: [],
    forceCreateDuplicate: false
  };
}

export async function POST(request: Request) {
  const { user, supabase } = await getRouteUser();
  if (!user) {
    return unauthorized();
  }

  let parsedPayload: ParsedCreatePayload;
  try {
    parsedPayload = await parseCreateCoursePayload(request);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid create-course payload.");
  }

  const entitlements = await getEntitlementsForUser(user.id);
  if (!entitlements.canGenerateCourse) {
    return forbidden("Free monthly course generation limit reached. Upgrade to Pro for unlimited usage.");
  }

  if (!parsedPayload.pastedText && parsedPayload.files.length === 0) {
    return badRequest("Provide pasted notes or at least one supported file.");
  }

  try {
    validateFiles(parsedPayload.files);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "File validation failed.");
  }

  const extractedSources: ExtractedSource[] = [];
  if (parsedPayload.pastedText) {
    extractedSources.push(await extractFromPastedText(parsedPayload.pastedText));
  }

  for (const file of parsedPayload.files) {
    try {
      const extracted = await extractFromFile(file);
      if (!extracted.extractedText) {
        return badRequest(`Could not extract readable text from "${file.name}".`);
      }
      extractedSources.push(extracted);
    } catch (error) {
      return badRequest(error instanceof Error ? error.message : `Failed processing "${file.name}".`);
    }
  }

  const combinedExtractedText = normalizeExtractedText(extractedSources.map((source) => source.extractedText).join("\n\n"));
  if (combinedExtractedText.length < INGESTION_LIMITS.minTotalExtractedChars) {
    return badRequest(
      `Not enough content to generate a course. Provide at least ${INGESTION_LIMITS.minTotalExtractedChars} readable characters.`
    );
  }
  if (combinedExtractedText.length > INGESTION_LIMITS.maxTotalExtractedChars) {
    return badRequest(
      `Uploaded content is too large after extraction. Keep total content under ${INGESTION_LIMITS.maxTotalExtractedChars} characters.`
    );
  }

  const sourceTextHash = computeSourceHash(combinedExtractedText.toLowerCase());
  const { data: duplicateCourse } = await supabase
    .from("courses")
    .select("id,title,status")
    .eq("user_id", user.id)
    .eq("source_text_hash", sourceTextHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicateCourse && !parsedPayload.forceCreateDuplicate) {
    return conflict(`This looks like notes you already uploaded for "${duplicateCourse.title}".`, {
      existingCourseId: duplicateCourse.id
    });
  }

  const fileSources = extractedSources.filter((source) => source.fileBuffer);
  const sourceType = resolveCourseSourceType(!!parsedPayload.pastedText, fileSources);

  const admin = createSupabaseAdminClient();
  const courseId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  let firstFileUrl: string | null = null;

  try {
    if (fileSources.length > 0) {
      await ensureCourseSourcesBucket();
    }

    const sourceRows: Array<{
      course_id: string;
      source_kind: "raw_text" | "pdf_page" | "image_ocr" | "text_file";
      source_name: string | null;
      extracted_text: string;
      sequence_index: number;
    }> = [];

    for (let index = 0; index < extractedSources.length; index += 1) {
      const source = extractedSources[index];

      if (source.fileBuffer && source.fileName && source.fileMimeType) {
        const uploadResult = await uploadCourseSourceFile({
          userId: user.id,
          courseId,
          fileName: source.fileName,
          contentType: source.fileMimeType,
          data: source.fileBuffer
        });

        if (!firstFileUrl && uploadResult.publicUrl) {
          firstFileUrl = uploadResult.publicUrl;
        }
      }

      sourceRows.push({
        course_id: courseId,
        source_kind: source.sourceKind,
        source_name: source.sourceName,
        extracted_text: source.extractedText,
        sequence_index: index
      });
    }

    const imageCount = fileSources.filter((source) => source.fileMimeType && IMAGE_MIME_TYPES.has(source.fileMimeType)).length;

    const { error: courseInsertError } = await admin.from("courses").insert({
      id: courseId,
      user_id: user.id,
      title: parsedPayload.title,
      source_type: sourceType,
      source_file_url: firstFileUrl,
      source_raw_text: parsedPayload.pastedText || null,
      source_image_count: imageCount > 0 ? imageCount : null,
      source_text_hash: sourceTextHash,
      status: "queued"
    });

    if (courseInsertError) {
      throw new Error(courseInsertError.message);
    }

    const { error: sourceInsertError } = await admin.from("course_sources").insert(sourceRows);
    if (sourceInsertError) {
      throw new Error(sourceInsertError.message);
    }

    const { error: jobInsertError } = await admin.from("generation_jobs").insert({
      id: jobId,
      user_id: user.id,
      course_id: courseId,
      status: "queued",
      job_type: "full_course",
      input_hash: sourceTextHash
    });
    if (jobInsertError) {
      throw new Error(jobInsertError.message);
    }

    await incrementCourseGenerationUsage(user.id);
  } catch (error) {
    await admin.from("courses").delete().eq("id", courseId);
    return badRequest(error instanceof Error ? error.message : "Course ingestion failed.");
  }

  return ok(createCourseResponseSchema.parse({ courseId, generationJobId: jobId, status: "queued" }));
}
