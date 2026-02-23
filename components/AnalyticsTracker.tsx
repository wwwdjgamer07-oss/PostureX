"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    apiFetch("/api/analytics", {
      method: "POST",
      body: JSON.stringify({
        eventName: "page_view",
        payload: {
          pathname,
          ts: Date.now()
        }
      })
    }).catch(() => {
      // Best-effort tracking.
    });
  }, [pathname]);

  return null;
}
