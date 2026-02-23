"use client";

import { useEffect, useState } from "react";

function readTheme() {
  if (typeof document === "undefined") return "";
  return document.documentElement.dataset.pxTheme ?? "";
}

export function usePxTheme() {
  const [themeId, setThemeId] = useState<string>(readTheme);

  useEffect(() => {
    const sync = () => setThemeId(readTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-px-theme"] });
    window.addEventListener("px-personalization-updated", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("px-personalization-updated", sync);
    };
  }, []);

  return themeId;
}

export function useIsObsidianSkullTheme() {
  return usePxTheme() === "obsidian_skull";
}

