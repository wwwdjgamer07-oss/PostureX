import { redirect } from "next/navigation";
import { ProfileWorkspaceClient } from "@/components/ProfileWorkspaceClient";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_tier: string | null;
}

interface UserPreferencesRow {
  user_id: string;
  dark_mode: boolean;
  reminders_enabled: boolean;
}

interface SessionRow {
  id: string;
  avg_alignment: number;
  avg_stability: number | null;
  avg_symmetry: number | null;
  peak_risk: string | null;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/profile");
  }

  const [userResult, preferenceResult, sessionResult] = await Promise.all([
    supabase.from("users").select("id, email, full_name, avatar_url, plan_tier").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("user_id, dark_mode, reminders_enabled").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("sessions")
      .select("id, avg_alignment, avg_stability, avg_symmetry, peak_risk")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50)
  ]);

  const profile = (userResult.data as UserRow | null) ?? null;
  const preferences = (preferenceResult.data as UserPreferencesRow | null) ?? null;
  const sessions = (sessionResult.data as SessionRow[] | null) ?? [];

  const avgAlignment = average(sessions.map((session) => Number(session.avg_alignment ?? 0)));
  const avgStability = average(sessions.map((session) => Number(session.avg_stability ?? 0)));
  const avgSymmetry = average(sessions.map((session) => Number(session.avg_symmetry ?? 0)));
  const highRiskSessions = sessions.filter((session) => {
    const risk = String(session.peak_risk ?? "LOW").toUpperCase();
    return risk === "HIGH" || risk === "SEVERE";
  }).length;

  const fullName = profile?.full_name ?? "PostureX Operator";
  const email = profile?.email ?? user.email ?? "";
  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);

  const roleLabel = planTier === "PRO" ? "Elite Performance" : planTier === "BASIC" ? "Performance Builder" : "Performance Starter";

  const stats = [
    { label: "Total Sessions", value: String(sessions.length) },
    { label: "Avg Alignment", value: `${Math.round(avgAlignment)}%` },
    { label: "Avg Stability", value: `${Math.round(avgStability)}%` },
    { label: "High Risk Sessions", value: String(highRiskSessions) },
    { label: "Avg Symmetry", value: `${Math.round(avgSymmetry)}%` }
  ];

  return (
    <ProfileWorkspaceClient
      userId={user.id}
      fullName={fullName}
      email={email}
      avatarUrl={profile?.avatar_url ?? null}
      planTier={planTier}
      roleLabel={roleLabel}
      stats={stats}
      preferences={{
        darkMode: preferences?.dark_mode ?? true,
        remindersEnabled: preferences?.reminders_enabled ?? true
      }}
    />
  );
}
