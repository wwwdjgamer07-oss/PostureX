"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { createClient } from "@/lib/supabase/client";
import { PlanTier } from "@/lib/types";

interface Props {
  userId: string;
  email: string;
  planTier: PlanTier;
  currentRole: string;
  canSwitchRole: boolean;
  dailyReminderEnabled: boolean;
  emailReportsEnabled: boolean;
  reportFrequency: "daily" | "weekly" | "off";
  reportTimezone: string;
}

export function SettingsClient({
  userId,
  email,
  planTier,
  currentRole,
  canSwitchRole,
  dailyReminderEnabled,
  emailReportsEnabled,
  reportFrequency,
  reportTimezone
}: Props) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [voiceCoach, setVoiceCoach] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(dailyReminderEnabled);
  const [updatingReminder, setUpdatingReminder] = useState(false);
  const [reportsEnabled, setReportsEnabled] = useState(emailReportsEnabled);
  const [reportsFrequency, setReportsFrequency] = useState<"daily" | "weekly" | "off">(reportFrequency);
  const [reportsTimezone, setReportsTimezone] = useState(reportTimezone || "UTC");
  const [updatingReports, setUpdatingReports] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<"USER" | "ADMIN">(currentRole === "ADMIN" ? "ADMIN" : "USER");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("mrx-settings");
    if (!raw) return;
    try {
      const settings = JSON.parse(raw) as {
        darkMode?: boolean;
        voiceCoach?: boolean;
        notifications?: boolean;
      };
      setDarkMode(settings.darkMode !== false);
      setVoiceCoach(settings.voiceCoach !== false);
      setNotifications(settings.notifications !== false);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    setDailyReminder(dailyReminderEnabled);
  }, [dailyReminderEnabled]);

  useEffect(() => {
    setReportsEnabled(emailReportsEnabled);
  }, [emailReportsEnabled]);

  useEffect(() => {
    setReportsFrequency(reportFrequency);
  }, [reportFrequency]);

  useEffect(() => {
    setReportsTimezone(reportTimezone || "UTC");
  }, [reportTimezone]);

  useEffect(() => {
    setRole(currentRole === "ADMIN" ? "ADMIN" : "USER");
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem(
      "mrx-settings",
      JSON.stringify({
        darkMode,
        voiceCoach,
        notifications
      })
    );
    window.dispatchEvent(new Event("posturex-settings-updated"));
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode, notifications, voiceCoach]);

  const updateDailyReminder = async (next: boolean) => {
    setError(null);
    setUpdatingReminder(true);
    setDailyReminder(next);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from("users").update({ daily_reminder_enabled: next }).eq("id", userId);
      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      setDailyReminder((value) => !value);
      setError(err instanceof Error ? err.message : "Failed to update daily reminder setting.");
    } finally {
      setUpdatingReminder(false);
    }
  };

  const updateReportSettings = async (next: {
    enabled?: boolean;
    frequency?: "daily" | "weekly" | "off";
    timezone?: string;
  }) => {
    setError(null);
    setUpdatingReports(true);

    const previous = {
      reportsEnabled,
      reportsFrequency,
      reportsTimezone
    };

    const timezoneFromBrowser =
      typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || reportsTimezone : reportsTimezone;

    const enabled = next.enabled ?? reportsEnabled;
    const requestedFrequency = next.frequency ?? reportsFrequency;
    const frequency = enabled && requestedFrequency === "off" ? "weekly" : requestedFrequency;
    const timezone = (next.timezone ?? timezoneFromBrowser) || "UTC";

    setReportsEnabled(enabled);
    setReportsFrequency(frequency);
    setReportsTimezone(timezone);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email_reports_enabled: enabled,
          report_frequency: enabled ? frequency : "off",
          report_timezone: timezone
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      setReportsEnabled(previous.reportsEnabled);
      setReportsFrequency(previous.reportsFrequency);
      setReportsTimezone(previous.reportsTimezone);
      setError(err instanceof Error ? err.message : "Failed to update report delivery settings.");
    } finally {
      setUpdatingReports(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm("Delete account permanently? This action cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await apiFetch("/api/account/delete", {
        method: "DELETE"
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete account.");
      setDeleting(false);
    }
  };

  const updateRole = async (nextRole: "USER" | "ADMIN") => {
    if (!canSwitchRole || role === nextRole) return;
    setUpdatingRole(true);
    setError(null);
    const previous = role;
    setRole(nextRole);
    try {
      const response = await fetch("/api/admin/role-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: nextRole })
      });
      const payload = (await response.json()) as { error?: string; role?: "USER" | "ADMIN" };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update role.");
      }
      if (payload.role === "USER" || payload.role === "ADMIN") {
        setRole(payload.role);
      }
      router.refresh();
    } catch (err) {
      setRole(previous);
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <section className="section-shell space-y-6 py-8">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Account and platform controls</h1>
      </header>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <p className="mt-2 text-sm text-slate-300">Signed in as {email}</p>
        <p className="mt-1 text-sm text-slate-300">
          Active plan: <span className="font-semibold text-blue-100">{planTier}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Current role: <span className="font-semibold text-cyan-100">{role}</span>
        </p>
      </div>

      {canSwitchRole ? (
        <div className="glass-card space-y-3 p-5">
          <h2 className="text-lg font-semibold text-white">Role Switch</h2>
          <p className="text-sm text-slate-300">Admin-only control to switch your account role.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={updatingRole || role === "USER"}
              onClick={() => {
                void updateRole("USER");
              }}
              className="btn-secondary disabled:opacity-60"
            >
              Switch to USER
            </button>
            <button
              type="button"
              disabled={updatingRole || role === "ADMIN"}
              onClick={() => {
                void updateRole("ADMIN");
              }}
              className="btn-secondary disabled:opacity-60"
            >
              Switch to ADMIN
            </button>
          </div>
          {updatingRole ? <p className="text-xs text-slate-400">Updating role...</p> : null}
        </div>
      ) : null}

      <div className="glass-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-white">Preferences</h2>
        {[
          ["Dark mode", darkMode, setDarkMode],
          ["AI Voice responses", voiceCoach, setVoiceCoach],
          ["Notifications", notifications, setNotifications]
        ].map(([label, value, setValue]) => (
          <label key={label as string} className="flex items-center justify-between gap-4 text-sm text-slate-200">
            <span>{label as string}</span>
            <button
              type="button"
              onClick={() => (setValue as (v: boolean) => void)(!(value as boolean))}
              className={`relative h-7 w-12 rounded-full border transition ${
                value ? "border-cyan-300/40 bg-cyan-300/25" : "border-blue-300/20 bg-slate-800"
              }`}
              aria-label={`Toggle ${label as string}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`}
              />
            </button>
          </label>
        ))}

        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
          <span>Daily reminder (6pm)</span>
          <button
            type="button"
            disabled={updatingReminder}
            onClick={() => {
              void updateDailyReminder(!dailyReminder);
            }}
            className={`relative h-7 w-12 rounded-full border transition disabled:opacity-60 ${
              dailyReminder ? "border-cyan-300/40 bg-cyan-300/25" : "border-blue-300/20 bg-slate-800"
            }`}
            aria-label="Toggle daily reminder"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${dailyReminder ? "left-6" : "left-1"}`} />
          </button>
        </label>
      </div>

      <div className="glass-card space-y-3 p-5">
        <h2 className="text-lg font-semibold text-white">Billing</h2>
        <p className="text-sm text-slate-300">Plans are managed with Razorpay checkout and instant activation.</p>
        <Link href="/pricing" className="btn-secondary inline-flex items-center gap-2 py-2">
          Manage Plan
        </Link>
      </div>

      <div className="glass-card space-y-4 p-5">
        <h2 className="text-lg font-semibold text-white">Automated PDF Reports</h2>
        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
          <span>Email reports enabled</span>
          <button
            type="button"
            disabled={updatingReports}
            onClick={() => {
              void updateReportSettings({
                enabled: !reportsEnabled,
                frequency: !reportsEnabled ? (reportsFrequency === "off" ? "weekly" : reportsFrequency) : "off"
              });
            }}
            className={`relative h-7 w-12 rounded-full border transition disabled:opacity-60 ${
              reportsEnabled ? "border-cyan-300/40 bg-cyan-300/25" : "border-blue-300/20 bg-slate-800"
            }`}
            aria-label="Toggle email reports"
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${reportsEnabled ? "left-6" : "left-1"}`} />
          </button>
        </label>

        <label className="block text-sm text-slate-300">
          Frequency
          <select
            disabled={!reportsEnabled || updatingReports}
            value={reportsFrequency}
            onChange={(event) => {
              const value = event.target.value as "daily" | "weekly" | "off";
              void updateReportSettings({ frequency: value, enabled: value !== "off" ? reportsEnabled : false });
            }}
            className="mt-1 w-full rounded-xl border border-slate-500/40 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 disabled:opacity-60"
          >
            <option value="daily">Daily (21:00 local)</option>
            <option value="weekly">Weekly (Sunday 20:00 local)</option>
            <option value="off">Off</option>
          </select>
        </label>

        <p className="text-xs text-slate-400">Timezone: {reportsTimezone}</p>
      </div>

      <div className="glass-card space-y-3 p-5">
        <h2 className="text-lg font-semibold text-white">Privacy & Account</h2>
        <Link href="/privacy" className="text-sm text-cyan-200 underline underline-offset-2">
          View privacy policy
        </Link>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={deleting}
          className="block rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          {deleting ? "Deleting..." : "Delete account"}
        </button>
        {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
      </div>
    </section>
  );
}
