import { useSyncExternalStore } from "react";
import {
  emptyRaceDayLocal,
  parseRaceDayLocal,
  raceDayCache,
  raceDayExpiryPath,
  raceDayStorageKey,
  raceDayStoragePrefix,
  type RaceDayLocal,
} from "../race-day-local";

const listeners = new Set<() => void>();
const memory = new Map<string, RaceDayLocal>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function readRaceDayLocal(raceId: string) {
  const known = memory.get(raceId);
  if (known) return known;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(raceDayStorageKey(raceId));
  } catch {
    raw = null;
  }
  const value = parseRaceDayLocal(raw);
  memory.set(raceId, value);
  return value;
}

export function updateRaceDayLocal(
  raceId: string,
  change: (local: RaceDayLocal) => RaceDayLocal,
) {
  const value = change(readRaceDayLocal(raceId));
  memory.set(raceId, value);
  try {
    window.localStorage.setItem(
      raceDayStorageKey(raceId),
      JSON.stringify(value),
    );
  } catch {}
  for (const listener of listeners) listener();
  return value;
}

export function useRaceDayLocal(raceId: string) {
  return useSyncExternalStore(
    subscribe,
    () => readRaceDayLocal(raceId),
    () => emptyRaceDayLocal,
  );
}

function staticAssets() {
  const urls = new Set<string>();
  const add = (value: string | null) => {
    if (!value) return;
    try {
      const url = new URL(value, window.location.origin);
      if (
        url.origin === window.location.origin &&
        url.pathname.startsWith("/_next/static/")
      )
        urls.add(url.href);
    } catch {}
  };
  document
    .querySelectorAll<HTMLScriptElement>("script[src]")
    .forEach((script) => add(script.getAttribute("src")));
  document
    .querySelectorAll<HTMLLinkElement>("link[href]")
    .forEach((link) => add(link.getAttribute("href")));
  for (const entry of performance.getEntriesByType("resource")) add(entry.name);
  return [...urls];
}

async function hasRaceDayCopy(href: string) {
  const saved = await caches
    .match(href, { cacheName: raceDayCache })
    .catch(() => undefined);
  return saved !== undefined;
}

async function writeRaceDayCopy(page: string, href: string, expiresAt: number) {
  await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const response = await fetch(page, {
    credentials: "same-origin",
    headers: { Accept: "text/html" },
  });
  if (!response.ok || response.redirected) return false;
  const cache = await caches.open(raceDayCache);
  await cache.put(href, response);
  await Promise.all(
    staticAssets().map(async (url) => {
      const asset = await fetch(url).catch(() => null);
      if (asset?.ok) await cache.put(url, asset);
    }),
  );
  await cache.put(
    `${raceDayExpiryPath}?page=${encodeURIComponent(page)}`,
    new Response(String(expiresAt)),
  );
  return true;
}

export async function saveRaceDayCopy(expiresAt: number) {
  if (!("serviceWorker" in navigator) || !("caches" in window)) return false;
  const page = window.location.pathname;
  const href = new URL(page, window.location.origin).href;
  const written = await writeRaceDayCopy(page, href, expiresAt).catch(
    () => false,
  );
  return written || hasRaceDayCopy(href);
}

export async function clearRaceDayCopies() {
  memory.clear();
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(raceDayStoragePrefix)) storage.removeItem(key);
    }
  } catch {}
  if ("caches" in window) await caches.delete(raceDayCache).catch(() => false);
}
