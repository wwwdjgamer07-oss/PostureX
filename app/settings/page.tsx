import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/SettingsClient";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/settings");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("plan_tier,role,daily_reminder_enabled,email_reports_enabled,report_frequency,report_timezone")
    .eq("id", user.id)
    .maybeSingle();

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);
  const currentRole = String(profile?.role ?? "USER").toUpperCase();
  const canSwitchRole = isPrimaryAdminEmail(user.email);
  const dailyReminderEnabled = profile?.daily_reminder_enabled ?? true;
  const emailReportsEnabled = profile?.email_reports_enabled ?? true;
  const reportFrequency = String(profile?.report_frequency ?? "weekly").toLowerCase() === "daily" ? "daily" : String(profile?.report_frequency ?? "weekly").toLowerCase() === "off" ? "off" : "weekly";
  const reportTimezone = String(profile?.report_timezone ?? "UTC");

  return (
    <SettingsClient
      userId={user.id}
      email={user.email || "unknown"}
      planTier={planTier}
      currentRole={currentRole}
      canSwitchRole={canSwitchRole}
      dailyReminderEnabled={dailyReminderEnabled}
      emailReportsEnabled={emailReportsEnabled}
      reportFrequency={reportFrequency}
      reportTimezone={reportTimezone}
    />
  );
}
