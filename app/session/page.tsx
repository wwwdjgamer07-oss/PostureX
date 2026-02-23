import { redirect } from "next/navigation";
import { SessionScreenClient } from "@/components/SessionScreenClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SessionPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/session");
  }

  return <SessionScreenClient />;
}
