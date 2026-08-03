// Real Web Push service worker. This is the one piece that actually needs
// to exist even when no tab is open - everything else (deciding when/what
// to proactively say) still happens in app.js while the app is open, then
// gets relayed through api/push-send.js. This file only shows the
// notification the push service delivers and handles tapping it.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Compass", body: "You have a new update." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON payload (shouldn't happen - push-send.js always sends
    // JSON) - fall back to the default text above rather than crash.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "assets/icon-home.png",
      badge: "assets/icon-home.png"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) return existing.focus();
      return self.clients.openWindow("/");
    })
  );
});
