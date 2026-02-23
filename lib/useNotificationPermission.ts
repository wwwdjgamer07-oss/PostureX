"use client";

import { useCallback, useEffect, useState } from "react";

export function useNotificationPermission() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : "denied");

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return "denied" as NotificationPermission;
    const next = await Notification.requestPermission();
    setPermission(next);
    return next;
  }, [supported]);

  return { supported, permission, requestPermission };
}

