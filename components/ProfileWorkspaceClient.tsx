"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { PXCustomizationPanel } from "@/components/pxplay/PXCustomizationPanel";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/uploadAvatar";

interface ProfileWorkspaceClientProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  planTier: string;
  roleLabel: string;
  stats: Array<{ label: string; value: string }>;
  preferences: {
    darkMode: boolean;
    remindersEnabled: boolean;
  };
}

export function ProfileWorkspaceClient({
  userId,
  fullName,
  email,
  avatarUrl,
  planTier,
  roleLabel,
  stats,
  preferences
}: ProfileWorkspaceClientProps) {
  const [preview, setPreview] = useState(avatarUrl);
  const [darkMode, setDarkMode] = useState(preferences.darkMode);
  const [remindersEnabled, setRemindersEnabled] = useState(preferences.remindersEnabled);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function persistPreferences(nextDarkMode: boolean, nextRemindersEnabled: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        dark_mode: nextDarkMode,
        reminders_enabled: nextRemindersEnabled
      });

      if (error) {
        throw error;
      }

      setMessage("Preferences saved.");
    } catch (errorValue) {
      setMessage(errorValue instanceof Error ? errorValue.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarSelect(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const { publicUrl } = await uploadAvatar(file, { userId });
      setPreview(publicUrl);
      setMessage("Avatar updated.");
    } catch (errorValue) {
      setMessage(errorValue instanceof Error ? errorValue.message : "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="px-shell space-y-6">
      <section className="px-panel p-6">
        <div className="grid gap-6 lg:grid-cols-[140px_1fr_auto] lg:items-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-3xl border border-cyan-300/30 bg-slate-900/60">
            {preview ? (
              <img src={preview} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-3xl font-semibold text-cyan-200">PX</div>
            )}
            {uploading ? (
              <div className="absolute inset-0 grid place-items-center bg-slate-950/70">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PostureX Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{fullName}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{email}</p>
            <p className="mt-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-100">
              {roleLabel}
            </p>
          </div>

          <div className="space-y-3">
            <label className="px-button-ghost cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload Avatar
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onAvatarSelect(file);
                  }
                }}
              />
            </label>
            <p className="rounded-full border border-slate-300/55 px-3 py-1 text-center text-xs uppercase tracking-wide text-slate-600 dark:border-slate-500/30 dark:text-slate-300">
              Plan {planTier}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="px-kpi">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="px-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-2xl border border-slate-300/55 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/55 dark:text-slate-200">
              Theme mode
              <DarkModeToggle />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-slate-300/55 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/55 dark:text-slate-200">
              Dark mode state
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(event) => {
                  const next = event.target.checked;
                  setDarkMode(next);
                  document.documentElement.classList.toggle("dark", next);
                  void persistPreferences(next, remindersEnabled);
                }}
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-slate-300/55 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-500/30 dark:bg-slate-900/55 dark:text-slate-200">
              Break reminders
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(event) => {
                  const next = event.target.checked;
                  setRemindersEnabled(next);
                  void persistPreferences(darkMode, next);
                }}
              />
            </label>
          </div>
          {saving ? <p className="mt-3 text-xs text-cyan-600 dark:text-cyan-200">Saving preferences...</p> : null}
        </article>

        <article className="px-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">PostureX Performance Summary</h2>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Track consistency over time. High alignment + stability with controlled risk produces stronger streak velocity.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li className="rounded-xl border border-slate-300/55 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">Maintain sessions above 80 posture score for optimal trend lift.</li>
            <li className="rounded-xl border border-slate-300/55 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">Use break reminders to reduce severe-risk spikes.</li>
            <li className="rounded-xl border border-slate-300/55 bg-white/70 px-3 py-2 dark:border-slate-500/25 dark:bg-slate-900/55">Run a focused session daily to preserve streak momentum.</li>
          </ul>
        </article>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.18em] text-cyan-300">PX Store</h2>
        <PXCustomizationPanel />
      </section>

      {message ? <p className="text-sm text-cyan-600 dark:text-cyan-200">{message}</p> : null}
    </main>
  );
}
