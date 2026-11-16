"use client";

import { useEffectEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  ComposerDraft,
  ComposerRestore,
} from "@/app/(app)/coach/_components/composer";
import {
  useCoachOutbox,
  useOnline,
} from "@/app/(app)/coach/_components/composer-hooks";
import { attachmentRefs } from "@/features/coach/attachments";
import {
  enqueueMessage,
  outboxNotice,
  outboxStep,
  removeMessage,
  sendsNow,
  type OutboxMessage,
} from "@/features/coach/outbox";
import {
  applyStreamEvent,
  beginExchange,
  emptyExchange,
  endSend,
  markSeen,
  reopenedExchange,
  type QuickAskExchange,
} from "@/features/coach/quick-ask";
import { interruptFailure, turnFailure } from "@/features/coach/stream";
import {
  interruptTurn,
  readTurnEvents,
  refusalFromResponse,
} from "@/features/coach/turn-client";
import { markCoachThreadsRead } from "@/server/coaching/actions";

const toastId = "quick-ask";

export function useQuickAskExchange() {
  const [exchange, setExchange] = useState<QuickAskExchange>(emptyExchange);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [restore, setRestore] = useState<ComposerRestore | null>(null);
  const turnThread = useRef<string | null>(null);
  const stopRequested = useRef(false);
  const flushing = useRef<string | null>(null);
  const online = useOnline();
  const [outbox, updateOutbox] = useCoachOutbox("quick-ask");
  const { pendingQuestion } = exchange;

  function queue(draft: ComposerDraft, first = false) {
    const message: OutboxMessage = { id: crypto.randomUUID(), ...draft };
    let added = false;
    updateOutbox((current) => {
      const next = first
        ? [message, ...current]
        : enqueueMessage(current, message);
      added = next !== current;
      return next;
    });
    return added;
  }

  async function interrupt(threadId: string) {
    if (await interruptTurn(threadId)) return;
    toast.error(interruptFailure, { id: toastId });
    setStopping(false);
  }

  function stop() {
    if (stopping || !busy) return;
    setStopping(true);
    if (turnThread.current) void interrupt(turnThread.current);
    else stopRequested.current = true;
  }

  async function send({ text, consult, attachments }: ComposerDraft) {
    if (busy) return false;
    const answering = pendingQuestion;
    const shown = attachments.map(({ kind, id, title, date }) => ({
      kind,
      id,
      title,
      date,
    }));
    const fail = (reason: string) => {
      toast.error(reason, { id: toastId });
      setRestore({ key: crypto.randomUUID(), text, attachments: shown });
    };
    setExchange((current) =>
      beginExchange(current, { text, attachments: shown }),
    );
    setStopping(false);
    stopRequested.current = false;
    turnThread.current = null;
    setBusy(true);
    let sent = false;
    let started = false;
    let queued = false;
    let thread: string | null = null;
    let turnError: string | null = null;
    try {
      const response = await fetch("/api/coach/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: { kind: "main" },
          mode: "conversation",
          input: answering
            ? { kind: "answer", toolUseId: answering, text }
            : {
                kind: "message",
                text,
                ...(consult ? { consult } : {}),
                ...(shown.length ? { attachments: attachmentRefs(shown) } : {}),
              },
        }),
      });
      if (!response.ok) fail(await refusalFromResponse(response));
      else {
        sent = true;
        await readTurnEvents(response, (event) => {
          if (event.type === "session") {
            started = true;
            thread = event.threadId;
            turnThread.current = event.threadId;
            if (stopRequested.current) {
              stopRequested.current = false;
              void interrupt(event.threadId);
            }
          }
          if (event.type === "error") turnError = event.text;
          setExchange((current) => applyStreamEvent(current, event));
        });
      }
    } catch {
      if (!started && !answering && !navigator.onLine)
        queued = queue({ text, consult, attachments: shown }, true);
      else if (!started) fail(turnFailure);
    } finally {
      if (turnError) toast.error(turnError, { id: toastId });
      setExchange(endSend);
      setBusy(false);
      turnThread.current = null;
    }
    if (sent && thread) void markCoachThreadsRead({ threadIds: [thread] });
    return sent || queued;
  }

  async function submit(draft: ComposerDraft) {
    if (pendingQuestion === null && !sendsNow({ online, working: busy }))
      return queue(draft);
    return send(draft);
  }

  const step = outboxStep(outbox, {
    online,
    working: busy,
    sending: busy,
    questionPending: pendingQuestion !== null,
  });
  const head = step.kind === "send" || step.kind === "restore" ? step : null;
  const flush = useEffectEvent(() => {
    if (!head || flushing.current === head.message.id) return;
    const { message } = head;
    flushing.current = message.id;
    updateOutbox((current) => removeMessage(current, message.id));
    if (head.kind === "restore") {
      setRestore({
        key: message.id,
        text: message.text,
        attachments: message.attachments,
      });
      return;
    }
    void send(message);
  });
  const headId = head?.message.id ?? null;
  const headKind = head?.kind ?? null;
  useEffect(() => {
    if (!headId || !headKind) return;
    const timer = window.setTimeout(flush, 0);
    return () => window.clearTimeout(timer);
  }, [headId, headKind]);

  const queuedNotice = outboxNotice(outbox.length, online);
  const notice = queuedNotice && {
    ...queuedNotice,
    ...(outbox.length > 0
      ? {
          onCancel: () => {
            const last = outbox.at(-1);
            if (!last) return;
            updateOutbox((current) => removeMessage(current, last.id));
            setRestore({
              key: last.id,
              text: last.text,
              attachments: last.attachments,
            });
          },
        }
      : {}),
  };

  return {
    exchange,
    busy,
    stopping,
    restore,
    notice,
    submit,
    stop,
    markSeen: () => setExchange(markSeen),
    reopen: () => setExchange((current) => reopenedExchange(current, busy)),
  };
}
