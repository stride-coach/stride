"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { SessionStateMark } from "@/components/stride/session-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  closeDailyCheckin,
  saveDailyCheckinAnswer,
} from "@/server/progress/actions";
import { checkinDone, type Checkin } from "../recovery";
import { CheckinQuestions, useCheckinAnswers } from "./checkin-questions";

const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

const summary = "Jambes, sommeil ressenti · 20 s";

function SidebarTrigger() {
  return (
    <DialogTrigger asChild>
      <button
        type="button"
        aria-label="Check-in du jour"
        className="flex w-full items-start gap-2.5 rounded-lg border border-control-border bg-card p-2.5 text-left transition-colors duration-150 ease-stride group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-1.5 hover:bg-muted"
      >
        <SessionStateMark state="today" className="mt-0.5" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
          <span className="font-medium">Check-in du jour</span>
          <span className="text-label text-muted-foreground">{summary}</span>
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
        />
      </button>
    </DialogTrigger>
  );
}

function QueueTrigger() {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">Check-in du jour</span>
        <span className="text-label text-muted-foreground">
          {summary}. Ton ressenti complète la forme du jour.
        </span>
      </span>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-fit">
          Faire le check-in
        </Button>
      </DialogTrigger>
    </div>
  );
}

export function DailyCheckin({
  initial,
  variant,
}: {
  initial: Checkin | null;
  variant: "sidebar" | "queue";
}) {
  const { answers, savedAt, answer } = useCheckinAnswers(
    initial,
    saveDailyCheckinAnswer,
  );
  const [open, setOpen] = useState(false);
  const done = checkinDone({ day: "", updatedAt: savedAt, ...answers });
  if (done && !open && variant === "sidebar") return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && savedAt) void closeDailyCheckin();
      }}
    >
      {variant === "sidebar" ? <SidebarTrigger /> : <QueueTrigger />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in du jour</DialogTitle>
          <DialogDescription>
            Une vingtaine de secondes. Ton coach en tient compte pour ta séance
            du jour.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <CheckinQuestions
            answers={answers}
            onAnswer={answer}
            idPrefix={`daily-checkin-${variant}`}
          />
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-label text-muted-foreground" aria-live="polite">
            {savedAt
              ? `Enregistré à ${time.format(new Date(savedAt))}`
              : "Chaque réponse s’enregistre tout de suite."}
          </span>
          <DialogClose asChild>
            <Button type="button" variant={done ? "default" : "outline"}>
              {done ? "Terminé" : "Fermer"}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
