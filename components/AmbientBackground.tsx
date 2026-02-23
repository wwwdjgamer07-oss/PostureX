"use client";

import { useEffect, useState } from "react";
import { FlyingCrows } from "@/components/FlyingCrows";
import { ParticleField } from "@/components/ParticleField";

function shouldShowAmbient() {
  if (typeof window === "undefined") return false;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !mobile && !reduced;
}

export function AmbientBackground() {
  const [enabled, setEnabled] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const refresh = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
      setEnabled(shouldShowAmbient());
    };

    const observer = new MutationObserver(refresh);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"]
    });

    mobileQuery.addEventListener("change", refresh);
    reducedQuery.addEventListener("change", refresh);
    refresh();

    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", refresh);
      reducedQuery.removeEventListener("change", refresh);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {isDark ? <ParticleField /> : null}
      <div className="absolute inset-0 z-20">
        <FlyingCrows lightMode={!isDark} />
      </div>
    </div>
  );
}
