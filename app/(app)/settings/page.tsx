import { SettingsForm } from "@/features/auth/settings-form";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <section className="card-surface p-5 sm:p-6">
      <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-600">Update your profile details.</p>
      <div className="mt-5">
        <SettingsForm
          email={profile?.email ?? user.email ?? ""}
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </section>
  );
}
