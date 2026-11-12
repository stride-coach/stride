"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { coachRequestHref } from "@/features/coach/request";
import { splitFrames } from "@/features/coach/stream";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { readRacePlanEffect } from "@/server/races/plan-effect";
import { planEffectRequest, type PlanEffect } from "../plan-effect";

const pollMilliseconds = 4000;

async function startCoach(raceId: string, title: string, text: string) {
  const response = await fetch("/api/coach/turns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: { kind: "new_topic", title, raceId },
      mode: "plan",
      input: { kind: "message", text, consult: "director" },
    }),
  });
  if (!response.ok || !response.body) return null;
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return null;
      const { events, rest } = splitFrames(buffer + value);
      buffer = rest;
      const session = events.find((event) => event.type === "session");
      if (session && session.type === "session") return session.threadId;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5"
    >
      <StrideMark className="mt-0.5 size-3.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function RacePlanEffect({
  raceId,
  name,
  priority,
  dateLabel,
}: {
  raceId: string;
  name: string;
  priority: string;
  dateLabel: string | null;
}) {
  const started = useRef(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [effect, setEffect] = useState<PlanEffect>({ state: "working" });
  const [unavailable, setUnavailable] = useState(false);
  const request = planEffectRequest({ name, priority, date: dateLabel });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startCoach(raceId, `Ajouter ${name}`.slice(0, 80), request)
      .then((id) => (id ? setThreadId(id) : setUnavailable(true)))
      .catch(() => setUnavailable(true));
  }, [raceId, name, request]);

  useEffect(() => {
    if (!threadId) return;
    if (["ready", "decided", "unchanged", "failed"].includes(effect.state))
      return;
    const timer = setTimeout(async () => {
      const next = await readRacePlanEffect(threadId).catch(() => null);
      if (next) setEffect(next);
      else setEffect((current) => ({ ...current }));
    }, pollMilliseconds);
    return () => clearTimeout(timer);
  }, [threadId, effect]);

  const topic = threadId ? `/coach/${threadId}` : null;
  if (unavailable)
    return (
      <Frame>
        <p className="font-medium">Ton plan n’a pas changé.</p>
        <p className="text-secondary-foreground">
          Le coach n’a pas pu être sollicité maintenant. Demande-lui d’adapter
          ton plan à cette course quand tu veux.
        </p>
        <Link
          href={coachRequestHref(request, null, raceId)}
          className="self-start font-medium text-primary hover:text-foreground"
        >
          Demander au coach
        </Link>
      </Frame>
    );
  if (effect.state === "ready")
    return (
      <Frame>
        <p className="font-medium">{effect.proposal.title}</p>
        {effect.proposal.summary && (
          <p className="text-pretty text-secondary-foreground">
            {effect.proposal.summary}
          </p>
        )}
        <p className="text-label text-muted-foreground">
          Rien n’est appliqué tant que tu n’as pas accepté.
        </p>
        <Button asChild className="self-start">
          <Link href={`/plan?proposal=${effect.proposal.id}`}>
            Examiner l’effet sur le plan
          </Link>
        </Button>
      </Frame>
    );
  if (effect.state === "decided")
    return (
      <Frame>
        <p className="font-medium">
          {effect.applied
            ? "Ton plan intègre cette course."
            : "Tu as gardé ton plan tel quel."}
        </p>
      </Frame>
    );
  const message =
    effect.state === "question"
      ? "Le coach a une question avant de te proposer un changement."
      : effect.state === "unchanged"
        ? "Le coach a répondu sans proposer de changement à ton plan."
        : effect.state === "failed"
          ? "Le coach n’a pas pu préparer de proposition."
          : "Le Directeur sportif regarde où tombe ta course dans ton plan.";
  return (
    <Frame>
      <p className="flex items-center gap-2 font-medium">
        {effect.state === "working" && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
        )}
        {effect.state === "working" ? "Le coach prépare ton plan…" : message}
      </p>
      {effect.state === "working" && (
        <p className="text-secondary-foreground">{message}</p>
      )}
      <p className="text-label text-muted-foreground">
        Tu peux quitter cette page : la proposition t’attendra dans Plan.
      </p>
      {topic && (
        <Link
          href={topic}
          className="self-start font-medium text-primary hover:text-foreground"
        >
          {effect.state === "question"
            ? "Répondre au coach"
            : "Suivre dans le Coach"}
        </Link>
      )}
    </Frame>
  );
}
