"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LayoutDashboard, Menu, Shield, Sparkles, User, Video, X } from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { AvatarMenu } from "@/components/AvatarMenu";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { StartFreeButton } from "@/components/StartFreeButton";
import { SkullAvatarIcon, SkullBrainIcon, SkullGridIcon, SkullJoystickIcon } from "@/components/icons/SkullIcons";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Shield },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-playground", label: "AI Playground", icon: Sparkles },
  { href: "/session", label: "Session", icon: Video },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User }
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const isObsidianSkull = useIsObsidianSkullTheme();

  useEffect(() => {
    let active = true;
    let supabase: SupabaseClient | null = null;

    const loadCurrentUser = async () => {
      if (!supabase) return;
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      let fullName: string | null = null;
      let email: string | null = authUser.email ?? null;
      let avatarUrl: string | null = null;

      const profileResult = await supabase.from("users").select("full_name,email,avatar_url").eq("id", authUser.id).maybeSingle();

      if (!profileResult.error && profileResult.data) {
        fullName = (profileResult.data as { full_name?: string | null }).full_name ?? null;
        email = (profileResult.data as { email?: string | null }).email ?? email;
        avatarUrl = (profileResult.data as { avatar_url?: string | null }).avatar_url ?? null;
      }

      const userName =
        fullName ||
        (typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name : null) ||
        authUser.email?.split("@")[0] ||
        "Operator";

      setUser({
        id: authUser.id,
        name: userName,
        email: email || authUser.email || "Unknown email",
        avatarUrl
      });
      setLoading(false);
    };

    try {
      supabase = createClient();
    } catch {
      if (active) {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!session?.user) {
        setUser(null);
      }
      void loadCurrentUser();
    });

    void loadCurrentUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="px-navbar fixed inset-x-0 top-0 z-50 border-b border-slate-300/45 bg-white/80 backdrop-blur-2xl dark:border-slate-500/20 dark:bg-[#0b0f14]/85">
      <div className="px-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className={cn(
            "px-brand-logo grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-cyan-300/55 bg-slate-950 text-sm font-extrabold leading-none text-cyan-200 transition group-hover:scale-[1.03] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]",
            isObsidianSkull ? "px-brand-logo-skull border-violet-300/50 bg-violet-400/15 text-violet-100" : ""
          )}>
            {isObsidianSkull ? (
              <img src="/skull1.jpeg" alt="Obsidian Skull logo" className="h-full w-full rounded-md object-cover" />
            ) : "PX"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">PostureX</p>
            <p className={cn("text-[10px] uppercase tracking-[0.22em] text-slate-600 dark:text-slate-400", isObsidianSkull ? "text-violet-300 dark:text-violet-200/85" : "")}>
              {isObsidianSkull ? "Obsidian Skull Edition" : "Posture Intelligence Engine"}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon =
              isObsidianSkull && link.href === "/dashboard"
                ? SkullGridIcon
                : isObsidianSkull && link.href === "/ai-playground"
                  ? SkullBrainIcon
                  : isObsidianSkull && link.href === "/session"
                    ? SkullJoystickIcon
                    : isObsidianSkull && link.href === "/profile"
                      ? SkullAvatarIcon
                      : link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  pathname === link.href
                    ? "border border-cyan-300/50 bg-cyan-500/10 text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-100"
                    : "border border-transparent text-slate-700 hover:border-slate-300/80 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-500/40 dark:hover:bg-slate-800/70 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!loading && user ? <NotificationBell /> : null}
          <DarkModeToggle />
          {!loading && user ? (
            <AvatarMenu user={user} onSignOut={signOut} />
          ) : (
            <div className="flex items-center gap-2">
              <StartFreeButton className="px-button-ghost py-2">Start Free</StartFreeButton>
              <Link href="/auth?provider=google" className="px-button-ghost py-2">
                Sign in
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-xl border border-slate-300/80 bg-white/80 p-2 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/70 dark:text-slate-200 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-300/55 bg-white/95 p-4 dark:border-slate-500/25 dark:bg-[#0b0f14]/95 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const Icon =
                isObsidianSkull && link.href === "/dashboard"
                  ? SkullGridIcon
                  : isObsidianSkull && link.href === "/ai-playground"
                    ? SkullBrainIcon
                    : isObsidianSkull && link.href === "/session"
                      ? SkullJoystickIcon
                      : isObsidianSkull && link.href === "/profile"
                        ? SkullAvatarIcon
                        : link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    pathname === link.href
                      ? "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-100"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-end gap-2">
              {!loading && user ? <NotificationBell /> : null}
              {!loading && !user ? <StartFreeButton className="px-button-ghost py-2">Start Free</StartFreeButton> : null}
              <DarkModeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

