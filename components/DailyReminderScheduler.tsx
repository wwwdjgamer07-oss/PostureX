"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationPermission } from "@/lib/useNotificationPermission";

const REMINDER_HOUR = 18;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DailyReminderScheduler() {
  const { supported, permission, requestPermission } = useNotificationPermission();

  useEffect(() => {
    if (!supported) return;

    let timeoutId: number | undefined;
    let intervalId: number | undefined;
    let active = true;

    const scheduleForUser = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("daily_reminder_enabled")
        .eq("id", user.id)
        .maybeSingle();

      if (!active || profile?.daily_reminder_enabled === false) return;

      if (permission === "default") {
        await requestPermission();
        return;
      }

      if (permission !== "granted") return;

      const fireIfNeeded = async () => {
        const now = new Date();
        if (now.getHours() < REMINDER_HOUR) return;

        const today = localDateKey(now);
        const firedKey = `px:daily-reminder:last-fired:${user.id}`;
        if (localStorage.getItem(firedKey) === today) return;

        const { data, error } = await supabase
          .from("daily_posture")
          .select("sessions_count")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (error) return;
        const sessionsToday = Number(data?.sessions_count ?? 0);
        if (sessionsToday > 0) return;

        new Notification("Posture Check", {
          body: "You haven't checked posture today",
          silent: true
        });
        localStorage.setItem(firedKey, today);
      };

      const now = new Date();
      const next = new Date();
      next.setHours(REMINDER_HOUR, 0, 0, 0);
      if (now > next) {
        next.setDate(next.getDate() + 1);
      }

      timeoutId = window.setTimeout(() => {
        void fireIfNeeded();
        intervalId = window.setInterval(() => {
          void fireIfNeeded();
        }, ONE_DAY_MS);
      }, Math.max(0, next.getTime() - now.getTime()));

      if (now.getHours() >= REMINDER_HOUR) {
        void fireIfNeeded();
      }

      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          void fireIfNeeded();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
      };
    };

    let cleanupVisibility: (() => void) | undefined;
    void scheduleForUser().then((cleanup) => {
      cleanupVisibility = cleanup;
    });

    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      cleanupVisibility?.();
    };
  }, [permission, requestPermission, supported]);

  return null;
}
