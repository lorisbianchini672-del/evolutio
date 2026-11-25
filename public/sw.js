// Service worker d'Evolutio : notifications des nouveaux avis.
// Volontairement minimal : aucune mise en cache, l'application reste toujours à jour.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "Evolutio", body: "Un nouvel avis vous attend.", url: "/app", tag: undefined, reviewId: undefined, quickPublish: false };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url, reviewId: data.reviewId },
      actions:
        data.quickPublish && data.reviewId
          ? [
              { action: "publier", title: "Publier la réponse" },
              { action: "ouvrir", title: "Modifier" },
            ]
          : [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const reviewId = event.notification.data && event.notification.data.reviewId;
  if (event.action === "publier" && reviewId) {
    event.waitUntil(
      fetch(`/api/avis/${encodeURIComponent(reviewId)}/publier`, { method: "POST", credentials: "include" })
        .then(async (res) => {
          if (res.ok) {
            return self.registration.showNotification("Réponse publiée ✓", {
              body: "Elle est en ligne sur votre fiche Google.",
              icon: "/icons/icon-192.png",
              badge: "/icons/badge-96.png",
              tag: `publie-${reviewId}`,
            });
          }
          const detail = await res.json().catch(() => ({}));
          return self.registration.showNotification("À relire avant publication", {
            body: detail.error || "Ouvrez l'avis pour vérifier la réponse.",
            icon: "/icons/icon-192.png",
            badge: "/icons/badge-96.png",
            tag: `avis-${reviewId}`,
            data: { url: `/app/rapide?avis=${reviewId}` },
          });
        })
        .catch(() => self.clients.openWindow(`/app/rapide?avis=${reviewId}`)),
    );
    return;
  }
  const url = new URL((event.notification.data && event.notification.data.url) || "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (new URL(win.url).origin === self.location.origin && "focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
