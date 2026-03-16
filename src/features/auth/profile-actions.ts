"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal(""))
});

export async function updateProfileAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    avatarUrl: formData.get("avatarUrl")
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid profile payload." };
  }

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName || null,
      avatar_url: parsed.data.avatarUrl || null
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Profile saved." };
}
