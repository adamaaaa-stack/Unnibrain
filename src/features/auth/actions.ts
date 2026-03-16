"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/config/env";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().max(120).optional()
});

const emailSchema = z.object({
  email: z.string().email()
});

function readNextPath(formData: FormData): string {
  const next = formData.get("next");
  if (typeof next !== "string" || !next.startsWith("/")) {
    return "/dashboard";
  }
  return next;
}

export async function signInWithPasswordAction(formData: FormData) {
  const nextPath = readNextPath(formData);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    redirect(`/sign-in?error=invalid_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(nextPath)}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signUpWithPasswordAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName")
  });

  if (!parsed.success) {
    redirect("/sign-up?error=invalid_payload");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName ?? null
      },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`
    }
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?success=account_created");
}

export async function sendMagicLinkAction(formData: FormData) {
  const parsed = emailSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    redirect("/sign-in?error=invalid_email");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`
    }
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?success=magic_link_sent");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
