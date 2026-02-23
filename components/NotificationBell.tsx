"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const refresh = useCallback(async (currentUserId: string) => {
    if (!supabase) return;
    const [{ data: latest, error: latestError }, { count, error: unreadError }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,user_id,title,message,type,read,created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUserId).eq("read", false)
    ]);

    if (!latestError && latest) {
      setNotifications(latest as AppNotification[]);
    }
    if (!unreadError) {
      setUnreadCount(count ?? 0);
    }
    setLoading(false);
  }, [supabase]);

  const markRead = async (notification: AppNotification) => {
    if (!supabase || !userId || notification.read) return;
    await supabase.from("notifications").update({ read: true }).eq("id", notification.id).eq("user_id", userId);
    setNotifications((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!mounted || !user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await refresh(user.id);
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [refresh, supabase]);

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as Partial<AppNotification>;
        if (row.user_id !== userId) return;
        void refresh(userId);
        toast(row.title ?? "New notification", {
          description: row.message ?? "You have a new update."
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, supabase, userId]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  if (!userId) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="px-theme-control relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-900/55 text-cyan-100 transition hover:border-cyan-200/70 hover:bg-slate-800/70"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="px-theme-notification-badge absolute -right-0.5 -top-0.5 min-w-5 rounded-full border border-cyan-200/40 bg-blue-500 px-1.5 text-[10px] font-semibold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-cyan-300/25 bg-slate-950/80 p-2 shadow-[0_20px_60px_rgba(37,99,235,0.28)] backdrop-blur-xl">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-xs text-slate-400">{unreadCount} unread</p>
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {loading ? <p className="px-2 py-3 text-xs text-slate-400">Loading...</p> : null}
            {!loading && notifications.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">No notifications yet.</p>
            ) : null}

            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item)}
                className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-cyan-300/25 hover:bg-blue-500/10"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${item.read ? "bg-slate-600" : "bg-cyan-300"}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-300">{item.message}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                      {item.type} · {formatTime(item.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
