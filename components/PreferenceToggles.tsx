"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface PreferenceTogglesProps {
  userId?: string;
  initialDarkMode?: boolean;
  initialRemindersEnabled?: boolean;
  preferences?: {
    darkMode?: boolean;
    remindersEnabled?: boolean;
  } | null;
}

export function PreferenceToggles({
  userId,
  initialDarkMode,
  initialRemindersEnabled,
  preferences
}: PreferenceTogglesProps) {
  const [darkMode, setDarkMode] = useState(initialDarkMode ?? preferences?.darkMode ?? false);
  const [remindersEnabled, setRemindersEnabled] = useState(
    initialRemindersEnabled ?? preferences?.remindersEnabled ?? true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistPreferences(nextDarkMode: boolean, nextRemindersEnabled: boolean) {
    if (!userId) {
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", nextDarkMode);
      }
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: upsertError } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        dark_mode: nextDarkMode,
        reminders_enabled: nextRemindersEnabled
      });

      if (upsertError) {
        throw upsertError;
      }

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", nextDarkMode);
      }
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Failed to update preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/40 p-5 shadow-xl backdrop-blur dark:bg-slate-900/40">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between rounded-lg border border-white/20 bg-white/50 p-3 dark:bg-slate-800/50">
          <span className="text-sm text-slate-700 dark:text-slate-200">Dark Mode</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(event) => {
              const next = event.target.checked;
              setDarkMode(next);
              void persistPreferences(next, remindersEnabled);
            }}
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-white/20 bg-white/50 p-3 dark:bg-slate-800/50">
          <span className="text-sm text-slate-700 dark:text-slate-200">Reminders Enabled</span>
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

      {saving ? <p className="mt-3 text-sm text-sky-200">Saving preferences...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}

export default PreferenceToggles;
