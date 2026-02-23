"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Loader2, LogOut, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/uploadAvatar";

interface AvatarMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  onSignOut: () => Promise<void> | void;
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  if (!source) return "U";
  const tokens = source.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AvatarMenu({ user, onSignOut }: AvatarMenuProps) {
  const isObsidianSkull = useIsObsidianSkullTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initials = useMemo(() => getInitials(user.name, user.email), [user.email, user.name]);
  const showAdminLinks = useMemo(() => isPrimaryAdminEmail(user.email), [user.email]);

  useEffect(() => {
    setAvatarUrl(user.avatarUrl || null);
  }, [user.avatarUrl]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const { publicUrl } = await uploadAvatar(file, { userId: user.id, supabase });
      setAvatarUrl(publicUrl);
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open user menu"
        className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-cyan-300/45 bg-slate-900/60 shadow-glow transition-all duration-300 hover:border-cyan-200/80"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : isObsidianSkull ? (
          <img src="/skull1.jpeg" alt="Skull avatar" className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-xs font-semibold tracking-wide text-cyan-100">{initials}</span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 w-72 rounded-2xl border border-cyan-300/25 bg-slate-950/80 p-3 shadow-[0_22px_80px_rgba(37,99,235,0.32)] backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-cyan-300/20 bg-slate-900/55 p-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-cyan-300/35 bg-slate-900"
              aria-label="Upload avatar"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : isObsidianSkull ? (
                <img src="/skull1.jpeg" alt="Skull avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-semibold tracking-wide text-cyan-100">{initials}</span>
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-300">{user.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-200 transition hover:text-cyan-100"
              >
                <Upload className="h-3 w-3" />
                Upload avatar
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          </div>

          {uploadError ? <p className="mb-2 text-xs text-red-300">{uploadError}</p> : null}

          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-blue-400/15 hover:text-cyan-100"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-100 transition hover:bg-blue-400/15 hover:text-cyan-100"
            >
              Settings
            </Link>
            {showAdminLinks ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-400/15 hover:text-amber-50"
              >
                Admin Panel
              </Link>
            ) : null}
            {showAdminLinks ? (
              <Link
                href="/admin/live"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-400/15 hover:text-amber-50"
              >
                Admin Live
              </Link>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await onSignOut();
              }}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-200 transition hover:bg-red-500/15 hover:text-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
