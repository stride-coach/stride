self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([self.clients.claim(), pruneRaceDay()]));
});

const raceDayCache = "stride-race-day-v1";
const raceDayPath = /^\/races\/[0-9a-f-]{36}\/day$/;
const raceDayExpiry = "/__race-day/expires";
const raceDayTimeout = 4000;

async function openRaceDay() {
  return (await caches.has(raceDayCache)) ? caches.open(raceDayCache) : null;
}

async function pruneRaceDay() {
  const cache = await openRaceDay();
  if (!cache) return;
  const now = Date.now();
  let live = 0;
  for (const request of await cache.keys()) {
    const url = new URL(request.url);
    if (url.pathname !== raceDayExpiry) continue;
    const response = await cache.match(request);
    const expires = Number(response ? await response.text() : 0);
    if (expires > now) {
      live += 1;
      continue;
    }
    await cache.delete(request);
    const page = url.searchParams.get("page");
    if (page) await cache.delete(new URL(page, self.location.origin).href);
  }
  if (live === 0) await caches.delete(raceDayCache);
}

async function savedRaceDay(url) {
  await pruneRaceDay();
  const cache = await openRaceDay();
  return cache ? cache.match(url.origin + url.pathname) : undefined;
}

async function raceDayPage(request, url) {
  const network = fetch(request);
  const first = await Promise.race([
    network.catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), raceDayTimeout)),
  ]);
  if (first) return first;
  const saved = await savedRaceDay(url);
  return saved ?? network;
}

async function staticAsset(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const saved = await caches.match(request, { cacheName: raceDayCache });
    if (saved) return saved;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    if (raceDayPath.test(url.pathname))
      event.respondWith(raceDayPage(request, url));
    else event.waitUntil(pruneRaceDay());
    return;
  }
  if (url.pathname.startsWith("/_next/static/"))
    event.respondWith(staticAsset(request));
});

function readMessage(event) {
  try {
    return event.data ? event.data.json() : null;
  } catch {
    return null;
  }
}

function sameOrigin(path) {
  if (typeof path !== "string") return null;
  try {
    const url = new URL(path, self.location.origin);
    return url.origin === self.location.origin ? url.href : null;
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  const message = readMessage(event);
  const title =
    message && typeof message.title === "string" ? message.title : "Stride";
  const options = {
    body: message && typeof message.body === "string" ? message.body : "",
    tag: message && typeof message.tag === "string" ? message.tag : undefined,
    lang: "fr",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: sameOrigin(message && message.url) ?? sameOrigin("/today"),
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    sameOrigin(event.notification.data && event.notification.data.url) ??
    sameOrigin("/today");
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (open) {
        try {
          await open.focus();
          await open.navigate(target);
          return;
        } catch {
          await self.clients.openWindow(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
