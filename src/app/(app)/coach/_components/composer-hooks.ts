"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  outboxStorageKey,
  parseOutbox,
  serializeOutbox,
  type Outbox,
} from "@/features/coach/outbox";

const outboxEvent = "stride:coach-outbox";
const memory = new Map<string, string>();

function readStored(key: string) {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function persist(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function writeStored(key: string, value: string | null) {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  persist(key, value);
  window.dispatchEvent(new Event(outboxEvent));
}

function subscribeOutbox(notify: () => void) {
  window.addEventListener(outboxEvent, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(outboxEvent, notify);
    window.removeEventListener("storage", notify);
  };
}

export function useCoachOutbox(conversation: string) {
  const key = outboxStorageKey(conversation);
  const raw = useSyncExternalStore(
    subscribeOutbox,
    () => readStored(key),
    () => null,
  );
  const outbox = useMemo(() => parseOutbox(raw), [raw]);
  const update = useCallback(
    (change: (current: Outbox) => Outbox) => {
      const next = change(parseOutbox(readStored(key)));
      writeStored(key, serializeOutbox(next));
      return next;
    },
    [key],
  );
  return [outbox, update] as const;
}

export function moveOutbox(from: string, to: string) {
  const fromKey = outboxStorageKey(from);
  const moving = parseOutbox(readStored(fromKey));
  if (moving.length === 0) return;
  const toKey = outboxStorageKey(to);
  writeStored(
    toKey,
    serializeOutbox([...parseOutbox(readStored(toKey)), ...moving]),
  );
  writeStored(fromKey, null);
}

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const keyboardThreshold = 80;

function subscribeViewport(notify: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", notify);
  viewport.addEventListener("scroll", notify);
  return () => {
    viewport.removeEventListener("resize", notify);
    viewport.removeEventListener("scroll", notify);
  };
}

function keyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const covered = window.innerHeight - viewport.height - viewport.offsetTop;
  return covered > keyboardThreshold ? Math.round(covered) : 0;
}

export function useKeyboardInset() {
  return useSyncExternalStore(subscribeViewport, keyboardInset, () => 0);
}
