import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getRouteUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { user, supabase };
}
