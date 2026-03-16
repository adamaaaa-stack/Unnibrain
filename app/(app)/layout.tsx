import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getEntitlementsForUser } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const [{ data: profile }, entitlement] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
    getEntitlementsForUser(user.id)
  ]);

  return (
    <AppShell
      userEmail={profile?.email ?? user.email ?? "user"}
      userName={profile?.full_name}
      entitlement={entitlement}
    >
      {children}
    </AppShell>
  );
}
