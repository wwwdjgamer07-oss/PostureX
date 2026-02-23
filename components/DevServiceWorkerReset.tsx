"use client";

import { useEffect } from "react";

export default function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const run = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(async (registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(async (key) => caches.delete(key)));
        }
      } catch {
        // Ignore cleanup errors in development.
      }
    };

    void run();
  }, []);

  return null;
}
