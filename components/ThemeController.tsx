"use client";

import { useEffect } from "react";

export function ThemeController() {
  useEffect(() => {
    const root = document.documentElement;
    const stored = window.localStorage.getItem("theme");

    if (stored === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      return;
    }

    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }, []);

  return null;
}
