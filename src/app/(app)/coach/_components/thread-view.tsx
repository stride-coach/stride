"use client";

import { useId } from "react";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextChipLink } from "@/components/stride/context-chip";
import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import { cn } from "@/lib/utils";
import {
  attachmentDate,
  attachmentHref,
  type SentAttachment,
} from "@/features/coach/attachments";
import { longWriteNote, workingLabel } from "@/features/coach/activity";
import { AttachmentIcon } from "@/features/coach/components/attachment-icon";
import { dayLabel, sameDay, timeLabel } from "@/features/coach/conversations";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { Markdown } from "@/features/coach/components/markdown";
import { staff as allStaff } from "@/features/coach/staff";
import type { StaffAgent } from "@/features/coach/staff";
import {
  questionAttribution,
  replyToLabel,
  typingLabel,
  type ProposalCardStatus,
  type StaffBlock,
  type ThreadEntry,
} from "@/features/coach/thread";
import { ProposalLink } from "../../plan/_components/proposal-sheet";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";

function StaffName({ agent }: { agent: StaffAgent }) {
  return (
    <span className="font-medium text-foreground">{allStaff[agent].name}</span>
  );
}

function StaffRow({
  agent,
  state = "idle",
  time,
  children,
}: {
  agent: StaffAgent;
  state?: "idle" | "think" | "speak";
  time?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3">
      <StaffAvatar agent={agent} size={30} state={state} decorative />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-h-7.5 items-baseline gap-2 pt-1.5">
          <StaffName agent={agent} />
          {time && (
            <span className="text-label text-muted-foreground tabular-nums">
              {time}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function QuestionCard({
  block,
  timeZone,
  onAnswer,
  onOther,
  disabled,
}: {
  block: Extract<StaffBlock, { type: "question" }>;
  timeZone: string;
  onAnswer: (text: string) => void;
  onOther: () => void;
  disabled: boolean;
}) {
  const staff = allStaff;
  const titleId = useId();
  const pending = block.state === "pending";
  return (
    <Widget
      role="group"
      aria-labelledby={titleId}
      title={questionAttribution(staff[block.askedFor])}
      verdict={
        pending ? (
          <Status level="watch">À répondre</Status>
        ) : block.state === "answered" ? (
          <span className="inline-flex items-center gap-1.5 text-label font-normal text-muted-foreground">
            <CheckIcon aria-hidden="true" className="size-3 text-primary" />
            Répondue
            {block.answeredAt && ` · ${timeLabel(block.answeredAt, timeZone)}`}
          </span>
        ) : block.state === "closed" ? (
          <span className="text-label font-normal text-muted-foreground">
            Restée sans réponse
          </span>
        ) : null
      }
      className="max-w-150"
    >
      <div className="flex flex-col gap-2.5">
        <p id={titleId} className="font-medium">
          {block.question}
        </p>
        {block.options.length > 0 && (pending || block.answer) && (
          <div className="flex flex-wrap gap-1.5">
            {block.options.map((option) => {
              const chosen = block.answer === option;
              return (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  aria-pressed={chosen}
                  disabled={!pending || disabled}
                  onClick={() => onAnswer(option)}
                  className={cn(
                    "h-auto min-h-control-auto py-1.5 text-left font-normal whitespace-normal text-secondary-foreground",
                    chosen &&
                      "border-transparent bg-accent font-medium text-primary disabled:opacity-100",
                  )}
                >
                  {chosen && (
                    <CheckIcon aria-hidden="true" className="size-3" />
                  )}
                  {option}
                </Button>
              );
            })}
            {pending && (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={onOther}
                className="font-normal text-secondary-foreground"
              >
                Autre…
              </Button>
            )}
          </div>
        )}
      </div>
    </Widget>
  );
}

const proposalStatus: Record<
  ProposalCardStatus,
  { label: string; level: "ok" | "watch" | null }
> = {
  pending: { label: "À toi de décider", level: "watch" },
  applying: { label: "Application en cours", level: "ok" },
  applied: { label: "Appliquée", level: "ok" },
  rejected: { label: "Refusée", level: null },
  closed: { label: "Plus applicable", level: null },
};

const proposalKickers: Record<
  Extract<StaffBlock, { type: "proposal" }>["scope"],
  string
> = {
  new_plan: "Proposition · Nouveau plan",
  session: "Proposition · Plan",
  race_strategy: "Proposition · Stratégie de course",
  race_nutrition: "Proposition · Nutrition de course",
};

function ProposalCard({
  block,
}: {
  block: Extract<StaffBlock, { type: "proposal" }>;
}) {
  const staff = allStaff;
  const status = proposalStatus[block.status];
  return (
    <Widget
      title={proposalKickers[block.scope]}
      verdict={
        status.level ? (
          <Status level={status.level}>{status.label}</Status>
        ) : (
          <span className="text-label font-normal text-muted-foreground">
            {status.label}
          </span>
        )
      }
      className="max-w-150"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-body-lg font-semibold">{block.title}</p>
          {block.summary && (
            <p className="text-secondary-foreground">{block.summary}</p>
          )}
        </div>
        {block.opinions.length > 0 && (
          <div className="flex flex-col border-t border-border">
            {block.opinions.map((opinion, index) => (
              <div
                key={index}
                className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-b border-border py-2 text-secondary-foreground last:border-b-0"
              >
                <StaffAvatar agent={opinion.agent} size={22} decorative />
                <span>
                  <b className="font-medium text-foreground">
                    {staff[opinion.agent].name}
                  </b>{" "}
                  · {opinion.summary}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant={block.status === "pending" ? "default" : "outline"}
          >
            {block.raceId &&
            (block.scope === "race_strategy" ||
              block.scope === "race_nutrition") ? (
              <Link
                href={`/races/${block.raceId}/${block.scope === "race_strategy" ? "roadbook" : "nutrition"}?proposal=${block.proposalId}`}
                data-proposal-id={block.proposalId}
              >
                {block.status === "pending"
                  ? "Examiner"
                  : "Voir la proposition"}
              </Link>
            ) : (
              <ProposalLink
                href={`/plan?proposal=${block.proposalId}`}
                data-proposal-id={block.proposalId}
              >
                {block.status === "pending"
                  ? "Examiner"
                  : "Voir la proposition"}
              </ProposalLink>
            )}
          </Button>
        </div>
      </div>
    </Widget>
  );
}

function StaffMessage({
  entry,
  timeZone,
  onAnswer,
  onOther,
  onRetry,
  busy,
}: {
  entry: Extract<ThreadEntry, { type: "staff" }>;
  timeZone: string;
  onAnswer: (text: string) => void;
  onOther: () => void;
  onRetry?: () => void;
  busy: boolean;
}) {
  return (
    <StaffRow agent={entry.agent} time={timeLabel(entry.at, timeZone)}>
      {entry.blocks.map((block, index) => {
        if (block.type === "text")
          return (
            <Markdown key={index} text={block.text} className="max-w-150" />
          );
        if (block.type === "question")
          return (
            <QuestionCard
              key={index}
              block={block}
              timeZone={timeZone}
              onAnswer={onAnswer}
              onOther={onOther}
              disabled={busy}
            />
          );
        if (block.type === "proposal")
          return <ProposalCard key={index} block={block} />;
        return (
          <div key={index} className="flex flex-col items-start gap-2">
            <p className="text-body text-destructive">{block.text}</p>
            {onRetry && index === entry.blocks.length - 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={onRetry}
              >
                <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                Renvoyer le message
              </Button>
            )}
          </div>
        );
      })}
      {entry.reads.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-label text-muted-foreground">A lu</span>
          {entry.reads.map((read) => (
            <Chip key={read}>{read}</Chip>
          ))}
        </div>
      )}
    </StaffRow>
  );
}

function TypingMessage({
  entry,
}: {
  entry: Extract<ThreadEntry, { type: "typing" }>;
}) {
  const staff = allStaff;
  return (
    <div role="status" aria-live="polite">
      <StaffRow agent={entry.agent} state="think">
        <span className="text-secondary-foreground">
          {typingLabel(staff[entry.agent], entry.read)}
        </span>
      </StaffRow>
    </div>
  );
}

function SentChips({ attachments }: { attachments: SentAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <ul
      aria-label="Contexte joint"
      className="mt-2.5 flex flex-wrap gap-1.5 whitespace-normal"
    >
      {attachments.map((attachment) => (
        <li
          key={`${attachment.kind}-${attachment.id}`}
          className="flex max-w-full"
        >
          <ContextChipLink
            href={attachmentHref(attachment)}
            icon={<AttachmentIcon kind={attachment.kind} />}
            label={attachment.title}
            meta={attachmentDate(attachment.date)}
          />
        </li>
      ))}
    </ul>
  );
}

function AthleteMessage({
  entry,
  timeZone,
}: {
  entry: Extract<ThreadEntry, { type: "athlete" }>;
  timeZone: string;
}) {
  const staff = allStaff;
  const target = entry.replyTo ?? entry.consult;
  return (
    <div className="flex max-w-[84%] flex-col items-end gap-1 self-end sm:max-w-[72%]">
      {target && (
        <span className="inline-flex items-center gap-1.5 text-label text-muted-foreground">
          <StaffAvatar agent={target} size={22} decorative />
          {entry.replyTo
            ? replyToLabel(staff[target])
            : `@${staff[target].name}`}
        </span>
      )}
      <div className="rounded-lg border border-border bg-muted px-3 py-2 whitespace-pre-wrap">
        {entry.text}
        <SentChips attachments={entry.attachments} />
      </div>
      <span className="text-label text-muted-foreground tabular-nums">
        {timeLabel(entry.at, timeZone)}
      </span>
    </div>
  );
}

export function ThreadLog({
  entries,
  pending,
  timeZone,
  now,
  busy,
  onAnswer,
  onOther,
  onRetry,
}: {
  entries: ThreadEntry[];
  pending: { text: string; attachments: SentAttachment[] } | null;
  timeZone: string;
  now: Date;
  busy: boolean;
  onAnswer: (text: string) => void;
  onOther: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      role="log"
      aria-label="Messages"
      className="mx-auto flex w-full max-w-180 flex-col gap-5.5 px-4 pt-4.5 pb-6 md:px-5"
    >
      {entries.map((entry, index) => {
        const previous = entries[index - 1];
        const separator =
          !previous || !sameDay(previous.at, entry.at, timeZone);
        return (
          <div key={entry.key} className="flex flex-col gap-5.5">
            {separator && (
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span className="text-label text-muted-foreground">
                  {dayLabel(entry.at, now, timeZone)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            {entry.type === "athlete" ? (
              <AthleteMessage entry={entry} timeZone={timeZone} />
            ) : entry.type === "typing" ? (
              <TypingMessage entry={entry} />
            ) : (
              <StaffMessage
                entry={entry}
                timeZone={timeZone}
                onAnswer={onAnswer}
                onOther={onOther}
                onRetry={
                  index === entries.length - 1 && !pending ? onRetry : undefined
                }
                busy={busy}
              />
            )}
          </div>
        );
      })}
      {pending && (
        <div className="flex max-w-[84%] flex-col self-end rounded-lg border border-border bg-muted px-3 py-2 whitespace-pre-wrap opacity-70">
          {pending.text}
          <SentChips attachments={pending.attachments} />
          <span className="sr-only">Envoi en cours</span>
        </div>
      )}
    </div>
  );
}

export function StaffWorking({
  composingSince,
  now,
}: {
  composingSince: string | null;
  now: Date;
}) {
  const staff = allStaff;
  const label = workingLabel(staff.coach, composingSince, now);
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-180 px-4 pb-4 md:px-5"
    >
      <StaffRow agent="coach" state={label.writing ? "speak" : "think"}>
        <span className="flex flex-wrap items-baseline gap-2 text-secondary-foreground">
          {label.text}
          {label.since && (
            <span className="text-label text-muted-foreground">
              {label.since}
            </span>
          )}
        </span>
        {label.writing && (
          <>
            <span
              aria-hidden="true"
              className="relative h-0.5 max-w-65 overflow-hidden rounded-full bg-muted"
            >
              <span className="absolute inset-y-0 left-0 w-[30%] bg-linear-to-r from-transparent via-primary to-transparent motion-safe:animate-trace motion-reduce:hidden" />
            </span>
            <p className="max-w-115 text-muted-foreground">{longWriteNote}</p>
          </>
        )}
      </StaffRow>
    </div>
  );
}
