"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContextChip } from "@/components/stride/context-chip";
import { SuggestedReplies } from "@/components/stride/suggested-reply";
import { cn } from "@/lib/utils";
import {
  attachmentDate,
  toggleAttachment,
  type AttachmentOption,
  type AttachmentOptions,
  type SentAttachment,
} from "@/features/coach/attachments";
import { AttachmentIcon } from "@/features/coach/components/attachment-icon";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import {
  inlineLayout,
  nextComposerLayout,
  sendButtonState,
} from "@/features/coach/composer";
import {
  consultOf,
  insertMention,
  mentionHints,
  mentionOptions,
  mentionQuery,
  openMention,
  stepMention,
  type MentionQuery,
} from "@/features/coach/mentions";
import { staff } from "@/features/coach/staff";
import type { SpecialistAgent, StaffAgent } from "@/features/coach/staff";
import { ContextPicker } from "./context-picker";
import { useKeyboardInset } from "./composer-hooks";

export type ComposerDraft = {
  text: string;
  consult: SpecialistAgent | null;
  attachments: SentAttachment[];
};

export type ComposerRestore = {
  key: string;
  text: string;
  attachments: SentAttachment[];
};

export type ComposerNotice = {
  offline: boolean;
  text: string;
  onCancel?: () => void;
};

function optionOf(attachment: SentAttachment): AttachmentOption {
  return { ...attachment, distanceKm: null, elevationGainM: null };
}

function lineCount(element: HTMLTextAreaElement) {
  const style = getComputedStyle(element);
  const line = parseFloat(style.lineHeight);
  if (!line) return 1;
  const content =
    element.scrollHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  return Math.max(1, Math.round(content / line));
}

function SendButton({
  state,
  stopping,
  onStop,
}: {
  state: "off" | "on" | "stop";
  stopping: boolean;
  onStop: () => void;
}) {
  const label = state === "stop" ? "Arrêter la réponse" : "Envoyer";
  const inert = state === "off" || (state === "stop" && stopping);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type={state === "stop" ? "button" : "submit"}
          variant={state === "stop" ? "outline" : "default"}
          size="icon-sm"
          aria-label={label}
          aria-disabled={inert || undefined}
          aria-keyshortcuts={state === "on" ? "Enter" : undefined}
          onClick={(event) => {
            if (inert) {
              event.preventDefault();
              return;
            }
            if (state === "stop") onStop();
          }}
          className={cn(
            "size-8 shrink-0 rounded-md p-0 md:size-7",
            state === "off" &&
              "border-transparent bg-muted text-muted-foreground hover:bg-muted",
            state === "stop" && stopping && "cursor-progress opacity-60",
          )}
        >
          {state === "stop" ? (
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[2px] bg-current"
            />
          ) : (
            <ArrowUpIcon aria-hidden="true" strokeWidth={1.8} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {state !== "stop" && <Kbd>Entrée</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function MentionList({
  id,
  options,
  active,
  onPick,
  onHover,
}: {
  id: string;
  options: StaffAgent[];
  active: number;
  onPick: (agent: StaffAgent) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      id={id}
      role="listbox"
      aria-label="Mentionner"
      className="absolute bottom-[calc(100%+6px)] left-0 z-40 flex w-80 max-w-full flex-col rounded-lg border border-control-border bg-background p-1.5 shadow-float md:left-24"
    >
      {options.map((agent, index) => (
        <div
          key={agent}
          id={`${id}-${agent}`}
          role="option"
          aria-selected={index === active}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onPick(agent)}
          className={cn(
            "flex min-h-8.5 cursor-pointer items-center gap-2.25 rounded-md px-2",
            index === active && "bg-muted",
          )}
        >
          <StaffAvatar agent={agent} size={22} decorative />
          <span className="shrink-0 font-medium whitespace-nowrap">
            {staff[agent].name}
          </span>
          <span className="ml-auto min-w-0 truncate pl-2 text-label text-muted-foreground">
            {mentionHints[agent]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Composer({
  placeholder,
  answering,
  working,
  stopping,
  initialText,
  initialAttachments,
  replies,
  options,
  today,
  help,
  notice,
  restore,
  className,
  onSend,
  onStop,
}: {
  placeholder: string;
  answering: boolean;
  working: boolean;
  stopping: boolean;
  initialText: string;
  initialAttachments: AttachmentOption[];
  replies: readonly string[];
  options: AttachmentOptions;
  today: string;
  help: boolean;
  notice: ComposerNotice | null;
  restore: ComposerRestore | null;
  className?: string;
  onSend: (draft: ComposerDraft) => Promise<boolean>;
  onStop: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] =
    useState<AttachmentOption[]>(initialAttachments);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layout, setLayout] = useState(inlineLayout);
  const [caret, setCaret] = useState(initialText.length);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [active, setActive] = useState({ key: "", index: 0 });
  const [restored, setRestored] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const contextTrigger = useRef<HTMLButtonElement>(null);
  const nextCaret = useRef<number | null>(null);
  const listId = useId();
  const keyboard = useKeyboardInset();

  if (restore && restore.key !== restored) {
    setRestored(restore.key);
    if (!text.trim()) {
      setText(restore.text);
      setCaret(restore.text.length);
      if (!answering) setAttachments(restore.attachments.map(optionOf));
    }
  }

  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    if (nextCaret.current !== null) {
      element.setSelectionRange(nextCaret.current, nextCaret.current);
      nextCaret.current = null;
    }
    const next = nextComposerLayout(layout, {
      text,
      lines: lineCount(element),
    });
    if (next !== layout) setLayout(next);
  }, [text, layout]);

  const query: MentionQuery | null =
    focused && !answering ? mentionQuery(text, caret) : null;
  const open = query !== null && query.start !== dismissed;
  const choices = open ? mentionOptions(query.query) : [];
  const queryKey = query ? `${query.start}:${query.query}` : "";
  const activeIndex = active.key === queryKey ? active.index : 0;
  const button = sendButtonState({ text, working });

  function edit(value: string, position: number) {
    setText(value);
    setCaret(position);
    nextCaret.current = position;
  }

  function pick(agent: StaffAgent) {
    if (!query) return;
    const next = insertMention(text, query, agent);
    edit(next.text, next.caret);
    input.current?.focus();
  }

  async function submit() {
    const message = text.trim();
    if (!message) return;
    const attached = answering ? [] : attachments;
    setText("");
    setCaret(0);
    setDismissed(null);
    if (!answering) setAttachments([]);
    await onSend({
      text: message,
      consult: answering ? null : consultOf(message),
      attachments: attached.map(({ kind, id, title, date }) => ({
        kind,
        id,
        title,
        date,
      })),
    });
  }

  async function reply(message: string) {
    await onSend({
      text: message,
      consult: null,
      attachments: [],
    });
  }

  function remove(option: AttachmentOption) {
    setAttachments((current) => toggleAttachment(current, option));
    input.current?.focus();
  }

  const stacked = layout.stacked;
  const controlSize = "size-8 md:size-7";

  return (
    <form
      data-keyboard={keyboard ? "open" : undefined}
      style={{ "--keyboard-inset": `${keyboard}px` } as React.CSSProperties}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className={cn(
        "relative z-30 mx-auto flex w-full max-w-180 flex-col gap-2.5 px-3 pt-2 max-md:data-[keyboard=open]:pb-(--keyboard-inset) md:border-t md:border-border md:px-5 md:pt-3 md:pb-4",
        className,
      )}
    >
      <SuggestedReplies
        replies={replies}
        onSelect={(message) => void reply(message)}
        className="max-sm:-mx-3 max-sm:px-3"
      />
      <div className="relative">
        {open && choices.length > 0 && (
          <MentionList
            id={listId}
            options={choices}
            active={activeIndex}
            onHover={(index) => setActive({ key: queryKey, index })}
            onPick={pick}
          />
        )}
        <InputGroup className="h-auto flex-wrap items-center gap-x-1 rounded-lg bg-card/92 px-1.5 backdrop-blur-[18px] has-[[data-slot=input-group-control]:focus]:border-primary supports-[not(backdrop-filter:blur(1px))]:bg-card md:gap-x-2 md:bg-card md:backdrop-blur-none">
          {!answering && attachments.length > 0 && (
            <ul
              aria-label="Contexte joint au message"
              className="order-0 flex w-full min-w-0 gap-1.5 px-0.5 pt-2 max-md:overflow-x-auto md:flex-wrap"
            >
              {attachments.map((option) => (
                <li
                  key={`${option.kind}-${option.id}`}
                  className="flex max-w-full shrink-0"
                >
                  <ContextChip
                    icon={<AttachmentIcon kind={option.kind} />}
                    label={option.title}
                    meta={attachmentDate(option.date)}
                    removeLabel={`Retirer ${option.title} du contexte`}
                    onRemove={() => remove(option)}
                  />
                </li>
              ))}
            </ul>
          )}
          {!answering && (
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 md:gap-2",
                stacked ? "order-2 pb-1.5" : "order-1",
              )}
            >
              <Button
                ref={contextTrigger}
                type="button"
                variant="ghost"
                aria-label="Ajouter du contexte : séance, activité ou course"
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen(true)}
                className={cn(
                  controlSize,
                  "p-0 text-secondary-foreground md:w-auto md:px-2.5 md:font-medium",
                )}
              >
                <PlusIcon aria-hidden="true" strokeWidth={1.6} />
                <span aria-hidden="true" className="max-md:hidden">
                  Contexte
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label="Mentionner un membre du staff"
                aria-haspopup="listbox"
                aria-expanded={open && choices.length > 0}
                onClick={() => {
                  const position = input.current?.selectionStart ?? text.length;
                  const next = openMention(text, position);
                  setDismissed(null);
                  edit(next.text, next.caret);
                  input.current?.focus();
                }}
                className={cn(controlSize, "p-0 text-secondary-foreground")}
              >
                @
              </Button>
            </div>
          )}
          <InputGroupTextarea
            ref={input}
            id="coach-composer"
            aria-label={answering ? "Ta réponse au staff" : "Écrire au staff"}
            aria-autocomplete={answering ? undefined : "list"}
            aria-controls={open && choices.length > 0 ? listId : undefined}
            aria-activedescendant={
              open && choices[activeIndex]
                ? `${listId}-${choices[activeIndex]}`
                : undefined
            }
            placeholder={placeholder}
            rows={1}
            value={text}
            maxLength={2000}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setText(event.target.value);
              setCaret(event.target.selectionStart);
            }}
            onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (open && choices.length > 0) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive({
                    key: queryKey,
                    index: stepMention(
                      activeIndex,
                      choices.length,
                      event.key === "ArrowDown" ? 1 : -1,
                    ),
                  });
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  pick(choices[activeIndex]);
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDismissed(query.start);
                  return;
                }
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className={cn(
              "max-h-[calc(6lh+1.25rem)] min-h-11 min-w-0 overflow-y-auto py-2.5 text-body-lg md:min-h-10",
              stacked
                ? "order-1 w-full basis-full px-1.5 pb-1"
                : "order-2 flex-1 basis-0 px-1",
            )}
          />
          <div
            className={cn(
              "flex shrink-0 items-center",
              stacked ? "order-3 ml-auto pb-1.5" : "order-3",
              answering && stacked && "pl-1",
            )}
          >
            <SendButton state={button} stopping={stopping} onStop={onStop} />
          </div>
        </InputGroup>
      </div>
      {notice && (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label"
        >
          {notice.offline && (
            <span className="inline-flex items-center gap-1.5 font-medium text-warning">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current"
              />
              Hors ligne
            </span>
          )}
          <span className="text-muted-foreground">{notice.text}</span>
          {notice.onCancel && (
            <Button
              type="button"
              variant="link"
              onClick={notice.onCancel}
              className="h-auto p-0 text-label"
            >
              Annuler
            </Button>
          )}
        </p>
      )}
      {!answering && (
        <ContextPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          options={options}
          selected={attachments}
          today={today}
          returnFocus={contextTrigger}
          onToggle={(option) =>
            setAttachments((current) => toggleAttachment(current, option))
          }
        />
      )}
      {help && (
        <p className="text-label text-muted-foreground">
          Le Coach lit chaque message et passe la main au bon spécialiste, deux
          au plus par demande.
        </p>
      )}
    </form>
  );
}
