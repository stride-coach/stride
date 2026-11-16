"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/stride/chip";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  correctableItemId,
  correctionTextLimit,
  staffCopyText,
} from "@/features/coach/corrections";
import type { ThreadEntry } from "@/features/coach/thread";
import { correctMessage } from "@/server/coaching/actions";

const longPressMs = 450;

type StaffEntry = Extract<ThreadEntry, { type: "staff" }>;

function CorrectionForm({
  itemId,
  onDone,
}: {
  itemId: string;
  onDone: () => void;
}) {
  const fieldId = useId();
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setFailed(false);
    startTransition(async () => {
      const result = await correctMessage({ itemId, text }).catch(
        () => ({ ok: false }) as const,
      );
      if (!result.ok) {
        setFailed(true);
        return;
      }
      toast.success("Correction envoyée. Le staff en tiendra compte.", {
        id: "coach-correction",
      });
      onDone();
    });
  }

  return (
    <form
      className="flex flex-col gap-2 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={fieldId} className="font-medium">
        Qu’est-ce qui n’est pas juste ?
      </label>
      <Textarea
        id={fieldId}
        value={text}
        maxLength={correctionTextLimit}
        rows={3}
        onChange={(event) => setText(event.target.value)}
        aria-describedby={failed ? `${fieldId}-error` : undefined}
      />
      {failed && (
        <p id={`${fieldId}-error`} role="alert" className="text-destructive">
          La correction n’a pas pu être envoyée. Réessaie dans un instant.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending || !text.trim()}>
          Envoyer la correction
        </Button>
      </div>
    </form>
  );
}

function ActionsMenu({
  entry,
  copyText,
  itemId,
  children,
}: {
  entry: StaffEntry;
  copyText: string;
  itemId: string;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [touchOpen, setTouchOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const open = touchOpen || readOpen || correctOpen;

  useEffect(() => {
    if (!touchOpen) return;
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setTouchOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [touchOpen]);

  function cancelPress() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Message copié.", { id: "coach-copy" });
    } catch {
      toast.error("Copie impossible. Sélectionne le texte pour le copier.", {
        id: "coach-copy",
      });
    }
    setTouchOpen(false);
  }

  return (
    <div
      ref={root}
      className="group relative"
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        cancelPress();
        timer.current = window.setTimeout(
          () => setTouchOpen(true),
          longPressMs,
        );
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerMove={cancelPress}
    >
      {children}
      <div
        role="toolbar"
        aria-label="Actions sur le message"
        data-open={open}
        className={cn(
          "absolute -top-3.5 right-2.5 z-10 flex gap-0.5 rounded-lg border border-control-border bg-popover p-0.5 text-popover-foreground opacity-0 shadow-float transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[open=true]:opacity-100 motion-reduce:transition-none",
        )}
      >
        <Button type="button" variant="ghost" size="sm" onClick={copy}>
          Copier
        </Button>
        <Popover open={readOpen} onOpenChange={setReadOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              Ce qui a été lu
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="gap-2 p-3">
            {entry.lookedAt.length > 0 ? (
              <>
                <span className="text-label text-muted-foreground">
                  Pour répondre, le staff a lu
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {entry.lookedAt.map((read) => (
                    <Chip key={read}>{read}</Chip>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-secondary-foreground">
                Le staff n’a rien consulté pour écrire ce message.
              </p>
            )}
          </PopoverContent>
        </Popover>
        <Popover open={correctOpen} onOpenChange={setCorrectOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              Ce n’est pas juste
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <CorrectionForm
              itemId={itemId}
              onDone={() => {
                setCorrectOpen(false);
                setTouchOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function MessageActions({
  entry,
  children,
}: {
  entry: StaffEntry;
  children: React.ReactNode;
}) {
  const copyText = staffCopyText(entry);
  const itemId = correctableItemId(entry);
  if (!copyText || !itemId) return children;
  return (
    <ActionsMenu entry={entry} copyText={copyText} itemId={itemId}>
      {children}
    </ActionsMenu>
  );
}
