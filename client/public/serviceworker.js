self.addEventListener("push", (event) => {
  console.log("Push Received...", event);
  const data = event.data ? event.data.json() : {};
  console.log("Push data:", data);

  event.waitUntil(
    (async () => {
      console.log("DEBUG: Showing notification…");
      const result = await self.registration.showNotification(data.title || "Emergency Alert", {
        body: data.body || "You have a new emergency alert",
        icon: data.icon || "/vite.svg",
        badge: data.badge || "/vite.svg",
        data: data.data || {},
        requireInteraction: data.requireInteraction !== false,
        tag: data.data?.emergencyId || "emergency",
      });
      console.log("DEBUG: Notification show result:", result);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === self.location.origin && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow("/main");
      }
    })
  );
});

