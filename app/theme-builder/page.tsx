"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeImageUpload } from "@/components/ThemeImageUpload";

interface ThemeDraft {
  id?: string;
  name: string;
  mode: "dark" | "light";
  colors: Record<string, string>;
  background_image: string;
  card_image: string;
  header_image: string;
  accent_image: string;
  avatar_image: string;
  is_active: boolean;
}

const defaultDraft: ThemeDraft = {
  name: "My Theme",
  mode: "dark",
  colors: { bg: "#020617", accent: "#22d3ee", text: "#e2e8f0" },
  background_image: "",
  card_image: "",
  header_image: "",
  accent_image: "",
  avatar_image: "",
  is_active: true
};

export default function ThemeBuilderPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ThemeDraft>(defaultDraft);
  const [themes, setThemes] = useState<ThemeDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const response = await fetch("/api/themes", { credentials: "include" });
      const payload = (await response.json().catch(() => ({ themes: [] }))) as { themes?: ThemeDraft[] };
      setThemes(payload.themes ?? []);
      const activeTheme = (payload.themes ?? []).find((theme) => theme.is_active);
      if (activeTheme) setDraft({ ...defaultDraft, ...activeTheme });
    };
    void boot();
  }, []);

  return (
    <main className="px-shell space-y-6">
      <header className="px-panel p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Theme Builder</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Create Personal Theme</h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="px-panel space-y-4 p-5">
          <input
            className="w-full rounded-lg border border-slate-500/30 bg-slate-900/45 px-3 py-2 text-sm text-white"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Theme Name"
          />
          <div className="grid grid-cols-3 gap-3">
            {(["bg", "accent", "text"] as const).map((key) => (
              <label key={key} className="space-y-1 text-xs text-slate-300">
                <span className="uppercase">{key}</span>
                <input
                  type="color"
                  value={draft.colors[key] ?? "#000000"}
                  onChange={(event) => setDraft((prev) => ({ ...prev, colors: { ...prev.colors, [key]: event.target.value } }))}
                  className="h-10 w-full rounded-md border border-slate-500/30 bg-slate-900/60"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, mode: prev.mode === "dark" ? "light" : "dark" }))}
              className="px-button-ghost"
            >
              Toggle {draft.mode === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              className="px-button"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  await fetch("/api/themes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(draft)
                  });
                  const response = await fetch("/api/themes", { credentials: "include" });
                  const payload = (await response.json().catch(() => ({ themes: [] }))) as { themes?: ThemeDraft[] };
                  setThemes(payload.themes ?? []);
                  setSaving(false);
                })();
              }}
            >
              {saving ? "Saving..." : "Save Theme"}
            </button>
          </div>

          {userId ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ThemeImageUpload userId={userId} slot="background_image" label="Background" value={draft.background_image} onUploaded={(url) => setDraft((prev) => ({ ...prev, background_image: url }))} />
              <ThemeImageUpload userId={userId} slot="card_image" label="Card Texture" value={draft.card_image} onUploaded={(url) => setDraft((prev) => ({ ...prev, card_image: url }))} />
              <ThemeImageUpload userId={userId} slot="header_image" label="Header Image" value={draft.header_image} onUploaded={(url) => setDraft((prev) => ({ ...prev, header_image: url }))} />
              <ThemeImageUpload userId={userId} slot="accent_image" label="Accent Graphic" value={draft.accent_image} onUploaded={(url) => setDraft((prev) => ({ ...prev, accent_image: url }))} />
              <ThemeImageUpload userId={userId} slot="avatar_image" label="Avatar" value={draft.avatar_image} onUploaded={(url) => setDraft((prev) => ({ ...prev, avatar_image: url }))} />
            </div>
          ) : null}
        </article>

        <article className="px-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Preview</p>
          <div
            className="mt-3 rounded-2xl border border-slate-500/30 p-6"
            style={{
              backgroundColor: draft.colors.bg,
              color: draft.colors.text,
              backgroundImage: draft.background_image ? `url(${draft.background_image})` : undefined,
              backgroundSize: "cover"
            }}
          >
            <h2 className="text-xl font-semibold">PostureX Theme Preview</h2>
            <p className="mt-2 text-sm">Cards, header, and dashboard widgets will use this theme.</p>
            <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: draft.colors.accent, color: "#001018" }}>
              Accent Block
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {themes.map((theme) => (
              <button key={theme.id ?? theme.name} type="button" className="w-full rounded-lg border border-slate-500/35 bg-slate-900/45 px-3 py-2 text-left text-sm text-slate-200" onClick={() => setDraft({ ...defaultDraft, ...theme })}>
                {theme.name}
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
