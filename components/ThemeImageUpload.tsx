"use client";

import { useState } from "react";
import { uploadThemeImage } from "@/lib/themeStorage";

interface ThemeImageUploadProps {
  userId: string;
  slot: "background_image" | "card_image" | "header_image" | "accent_image" | "avatar_image";
  label: string;
  value: string;
  onUploaded: (url: string) => void;
}

export function ThemeImageUpload({ userId, slot, label, value, onUploaded }: ThemeImageUploadProps) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      {value ? <img src={value} alt={label} className="h-20 w-full rounded-lg border border-slate-500/40 object-cover" /> : null}
      <input
        type="file"
        accept="image/*"
        disabled={loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void (async () => {
            setLoading(true);
            const url = await uploadThemeImage(userId, file, slot);
            onUploaded(url);
            setLoading(false);
          })();
        }}
        className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border file:border-cyan-300/40 file:bg-cyan-400/10 file:px-3 file:py-1 file:text-cyan-100"
      />
    </div>
  );
}
