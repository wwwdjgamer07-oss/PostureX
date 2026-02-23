"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

export function DarkModeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextMode: ThemeMode = stored === "light" || stored === "dark" ? stored : preferredDark ? "dark" : "light";
    setMode(nextMode);
    applyTheme(nextMode);
    setReady(true);
  }, []);

  const toggle = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
    applyTheme(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ready && mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="px-theme-control inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-900/55 text-cyan-200 transition-all duration-300 hover:border-cyan-200/70 hover:bg-slate-800/70 dark:bg-slate-900/55 dark:text-cyan-200"
    >
      {ready && mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
