/* global self, clients */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "PostureX";
  const body = typeof payload.body === "string" ? payload.body : "";
  const icon = typeof payload.icon === "string" && payload.icon.trim() ? payload.icon : "/icon.svg";
  const url =
    payload && typeof payload.data === "object" && payload.data && typeof payload.data.url === "string" && payload.data.url.startsWith("/")
      ? payload.data.url
      : "/dashboard";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icon.svg",
      data: { url },
      silent: true,
      renotify: false,
      requireInteraction: false
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification?.data?.url && typeof event.notification.data.url === "string" ? event.notification.data.url : "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const absoluteTarget = new URL(targetPath, self.location.origin).href;
      for (const client of windowClients) {
        if (client.url === absoluteTarget && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteTarget);
      }
      return undefined;
    })
  );
});
