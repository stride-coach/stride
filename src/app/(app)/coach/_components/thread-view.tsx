"use client";

import { createContext, useContext, useId, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ContextChipLink,
  ContextChipStatic,
} from "@/components/stride/context-chip";
import { Chip } from "@/components/stride/chip";
import { SessionShape } from "@/components/stride/session-shape";
import { Status } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import { cn } from "@/lib/utils";
import {
  attachmentDate,
  attachmentHref,
  type SentAttachment,
} from "@/features/coach/attachments";
import { longWriteNote, workingLabel } from "@/features/coach/activity";
import {
  cardScale,
  cardText,
  linkTargets,
  type DataCard,
} from "@/features/coach/blocks";
import { PlageTrack } from "@/components/stride/plage";
import { AttachmentIcon } from "@/features/coach/components/attachment-icon";
import { dayLabel, sameDay, timeLabel } from "@/features/coach/conversations";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { Markdown } from "@/features/coach/components/markdown";
import {
  Highlighted,
  type Highlight,
} from "@/features/coach/components/highlighted";
import { StrideMark } from "@/components/stride/stride-mark";
import {
  proposalStatusLine,
  type ProposalCard,
} from "@/features/coach/proposal-card";
import { summaryCard } from "@/features/coach/topics";
import { reasonText } from "@/features/plans/review/proposal";
import {
  acceptProposal,
  rejectProposal,
  undoProposal,
  type ProposalActionResult,
} from "@/server/plans/actions";
import { staff as allStaff } from "@/features/coach/staff";
import type { SpecialistAgent, StaffAgent } from "@/features/coach/staff";
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

export type FailedMessage = {
  key: string;
  text: string;
  consult: SpecialistAgent | null;
  attachments: SentAttachment[];
  revising: string | null;
  reason: string | null;
};

export type ThreadSearch = {
  query: string;
  currentId: string | null;
  matchIds: ReadonlySet<string>;
} | null;

const SearchContext = createContext<ThreadSearch>(null);

function useHighlight(itemId: string | undefined): Highlight {
  const search = useContext(SearchContext);
  if (!search || !itemId || !search.matchIds.has(itemId)) return null;
  return { query: search.query, current: itemId === search.currentId };
}

function searchMark(itemId: string | undefined, highlight: Highlight) {
  return {
    "data-item-id": itemId,
    "data-search-current": highlight?.current ? "true" : undefined,
  };
}

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
  onRevise,
  disabled,
}: {
  block: Extract<StaffBlock, { type: "question" }>;
  timeZone: string;
  onAnswer: (text: string) => void;
  onOther: () => void;
  onRevise?: (text: string) => void;
  disabled: boolean;
}) {
  const staff = allStaff;
  const titleId = useId();
  const highlight = useHighlight(block.itemId);
  const pending = block.state === "pending";
  return (
    <Widget
      {...searchMark(block.itemId, highlight)}
      role="group"
      aria-labelledby={titleId}
      title={questionAttribution(staff[block.askedFor])}
      verdict={
        pending ? (
          <Status level="watch">Attend ta réponse</Status>
        ) : block.state === "answered" ? (
          <Status level="ok">
            Répondue
            {block.answeredAt && ` · ${timeLabel(block.answeredAt, timeZone)}`}
          </Status>
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
          <Highlighted text={block.question} highlight={highlight} />
        </p>
        {block.options.length > 0 && (pending || block.answer) && (
          <div className="flex flex-wrap gap-1.5">
            {block.options.map((option) => {
              const chosen = block.answer === option;
              const open = pending || (onRevise !== undefined && !chosen);
              return (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  aria-pressed={chosen}
                  disabled={!open || disabled}
                  onClick={() =>
                    pending ? onAnswer(option) : onRevise?.(option)
                  }
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
                Autre réponse
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

const decisionFailures: Partial<
  Record<ProposalActionResult["status"], string>
> = {
  error: "Ta décision n’a pas pu être enregistrée. Réessaie dans un instant.",
  pending:
    "Ta décision est enregistrée, mais le plan n’a pas pu être mis à jour. Réessaie depuis Plan.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour décider.",
  "invalid-request": "Cette proposition ne peut plus être décidée.",
};

function ProposalDecisionLine({
  card,
  timeZone,
  pending,
  onUndo,
}: {
  card: ProposalCard;
  timeZone: string;
  pending: boolean;
  onUndo: () => void;
}) {
  const line = proposalStatusLine(card.decision, card, timeZone);
  if (!line) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2">
        <Status
          level="ok"
          className={cn(line.tone === "muted" && "text-muted-foreground")}
        >
          {line.label}
        </Status>
        {card.decision.canUndo && (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={pending}
            onClick={onUndo}
            className="ml-auto h-auto p-0"
          >
            Annuler
          </Button>
        )}
      </span>
      {line.outcome && (
        <span className="text-label text-muted-foreground">{line.outcome}</span>
      )}
    </div>
  );
}

function ProposalWidget({
  block,
  timeZone,
}: {
  block: Extract<StaffBlock, { type: "proposal" }>;
  timeZone: string;
}) {
  const staff = allStaff;
  const highlight = useHighlight(block.itemId);
  const [pending, startTransition] = useTransition();
  const status = proposalStatus[block.status];
  const card = block.card;
  const preview = card?.preview ?? null;
  const decidable =
    card !== null &&
    card.decision.state === "pending" &&
    card.decision.canDecide;
  const race =
    block.raceId &&
    (block.scope === "race_strategy" || block.scope === "race_nutrition");

  function decide(
    action: (input: unknown) => Promise<ProposalActionResult>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action({ proposalId: block.proposalId }).catch(
        (): ProposalActionResult => ({ status: "error" }),
      );
      if (
        result.status === "applied" ||
        result.status === "rejected" ||
        result.status === "reverted"
      ) {
        toast.success(success, { id: "coach-decision" });
        return;
      }
      const text =
        result.status === "stale" || result.status === "invalid"
          ? reasonText(result.reason)
          : decisionFailures[result.status];
      if (text) toast.error(text, { id: "coach-decision" });
    });
  }

  const keepLabel = preview?.keep ? `Garder ${preview.keep}` : "Refuser";
  return (
    <Widget
      {...searchMark(block.itemId, highlight)}
      aria-busy={pending}
      title={preview?.heading ?? proposalKickers[block.scope]}
      verdict={
        card ? (
          card.decision.state === "pending" ? (
            <Chip proposal>Proposition</Chip>
          ) : null
        ) : status.level ? (
          <Status level={status.level}>{status.label}</Status>
        ) : (
          <span className="text-label font-normal text-muted-foreground">
            {status.label}
          </span>
        )
      }
      className={cn(
        "max-w-150",
        card?.decision.state === "expired" && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-body-lg font-semibold">
              <Highlighted text={block.title} highlight={highlight} />
            </span>
            {preview?.meta && (
              <span className="text-label text-muted-foreground tabular-nums">
                {preview.meta}
              </span>
            )}
          </p>
          {!preview && block.summary && (
            <p className="text-secondary-foreground">
              <Highlighted text={block.summary} highlight={highlight} />
            </p>
          )}
        </div>
        {preview &&
          card?.decision.state === "pending" &&
          preview.blocks.length > 0 && (
            <SessionShape blocks={preview.blocks} className="h-5.5" />
          )}
        {!preview && block.opinions.length > 0 && (
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
        {card && (
          <ProposalDecisionLine
            card={card}
            timeZone={timeZone}
            pending={pending}
            onUndo={() =>
              decide(
                undoProposal,
                card.scope === "session" && preview
                  ? "Ta séance revient comme avant."
                  : "Ton plan revient comme avant.",
              )
            }
          />
        )}
        {decidable ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              disabled={pending}
              onClick={() => decide(acceptProposal, "Proposition appliquée.")}
            >
              Accepter
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                decide(
                  rejectProposal,
                  preview?.keep
                    ? `Tu gardes ${preview.keep}.`
                    : "Proposition refusée.",
                )
              }
            >
              {keepLabel}
            </Button>
          </div>
        ) : (
          !card && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant={block.status === "pending" ? "default" : "outline"}
              >
                {race ? (
                  <Link
                    href={`/races/${block.raceId}/${block.scope === "race_strategy" ? "scenarios" : "nutrition"}?proposal=${block.proposalId}`}
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
          )
        )}
      </div>
    </Widget>
  );
}

function DataCardBlock({ card, itemId }: { card: DataCard; itemId?: string }) {
  const text = cardText(card);
  return (
    <Widget
      data-item-id={itemId}
      aria-label={text.label}
      title={text.label}
      verdict={
        <Status level={card.position === "within" ? "ok" : "watch"}>
          {text.verdict}
        </Status>
      }
      className="max-w-115"
    >
      <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
        <span className="flex flex-col tabular-nums">
          <b className="text-body-lg font-semibold">{text.value}</b>
          <span className="text-label text-muted-foreground">
            <span className="sr-only">Ta plage : </span>
            {text.range}
          </span>
        </span>
        <PlageTrack
          scale={cardScale(card)}
          level={card.position === "within" ? "ok" : "watch"}
        />
      </div>
    </Widget>
  );
}

function ChoicesBlock({
  choices,
  open,
  disabled,
  onChoose,
}: {
  choices: string[];
  open: boolean;
  disabled: boolean;
  onChoose: (text: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Choix proposés"
      className="flex flex-wrap gap-1.5"
    >
      {choices.map((choice) => (
        <Button
          key={choice}
          type="button"
          variant="outline"
          disabled={!open || disabled}
          onClick={() => onChoose(choice)}
          className="h-auto min-h-control-auto py-1.5 text-left font-normal whitespace-normal text-secondary-foreground"
        >
          {choice}
        </Button>
      ))}
    </div>
  );
}

function LinksBlock({
  links,
}: {
  links: Extract<StaffBlock, { type: "links" }>["links"];
}) {
  return (
    <nav aria-label="Aller à" className="flex flex-wrap gap-1.5">
      {links.map((destination) => (
        <Button key={destination} asChild variant="outline">
          <Link href={linkTargets[destination].href} prefetch={false}>
            {linkTargets[destination].label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

function TextBlock({ itemId, text }: { itemId?: string; text: string }) {
  const highlight = useHighlight(itemId);
  return (
    <Markdown
      {...searchMark(itemId, highlight)}
      text={text}
      highlight={highlight}
      className="max-w-150"
    />
  );
}

function StaffMessage({
  entry,
  timeZone,
  onAnswer,
  onOther,
  onRetry,
  revisableId,
  onRevise,
  busy,
}: {
  entry: Extract<ThreadEntry, { type: "staff" }>;
  timeZone: string;
  onAnswer: (text: string) => void;
  onOther: () => void;
  onRetry?: () => void;
  revisableId: string | null;
  onRevise?: (toolUseId: string, text: string) => void;
  busy: boolean;
}) {
  return (
    <StaffRow agent={entry.agent} time={timeLabel(entry.at, timeZone)}>
      {entry.blocks.map((block, index) => {
        if (block.type === "text")
          return (
            <TextBlock key={index} itemId={block.itemId} text={block.text} />
          );
        if (block.type === "question")
          return (
            <QuestionCard
              key={index}
              block={block}
              timeZone={timeZone}
              onAnswer={onAnswer}
              onOther={onOther}
              onRevise={
                onRevise && block.toolUseId === revisableId
                  ? (text) => onRevise(block.toolUseId, text)
                  : undefined
              }
              disabled={busy}
            />
          );
        if (block.type === "proposal")
          return (
            <ProposalWidget key={index} block={block} timeZone={timeZone} />
          );
        if (block.type === "data_card")
          return (
            <DataCardBlock
              key={index}
              card={block.card}
              itemId={block.itemId}
            />
          );
        if (block.type === "choices")
          return (
            <ChoicesBlock
              key={index}
              choices={block.choices}
              open={block.open}
              disabled={busy}
              onChoose={onAnswer}
            />
          );
        if (block.type === "links")
          return <LinksBlock key={index} links={block.links} />;
        if (block.interrupted)
          return (
            <div
              key={index}
              data-item-id={block.itemId}
              role="group"
              aria-label="Réponse interrompue"
              className="flex max-w-150 flex-col items-start gap-2 rounded-lg border border-border bg-card px-3.5 py-3"
            >
              <Status level="watch">Réponse interrompue</Status>
              <p className="text-secondary-foreground">
                Je n’ai pas pu finir ma réponse. Rien n’a été modifié dans ton
                plan.
              </p>
              {onRetry && index === entry.blocks.length - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={onRetry}
                >
                  Réessayer
                </Button>
              )}
            </div>
          );
        return (
          <div
            key={index}
            data-item-id={block.itemId}
            className="flex flex-col items-start gap-2"
          >
            <p className="text-body text-destructive">{block.text}</p>
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

function TopicSummaryMessage({
  entry,
  timeZone,
}: {
  entry: Extract<ThreadEntry, { type: "topic_summary" }>;
  timeZone: string;
}) {
  const card = summaryCard(entry.item, timeZone);
  const highlight = useHighlight(entry.item.id);
  return (
    <StaffRow agent={card.lead} time={timeLabel(entry.at, timeZone)}>
      <Widget
        {...searchMark(entry.item.id, highlight)}
        title={card.heading}
        icon={<StrideMark />}
        verdict={
          <span className="text-label font-normal text-muted-foreground tabular-nums">
            {card.range}
          </span>
        }
        className="max-w-150"
      >
        <div className="flex flex-col gap-3">
          {card.summary ? (
            <p className="text-secondary-foreground">
              <Highlighted text={card.summary} highlight={highlight} />
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {card.chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
          <Button asChild variant="outline" className="self-start">
            <Link href={card.href} prefetch={false}>
              Relire le sujet
            </Link>
          </Button>
        </div>
      </Widget>
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
      <StaffRow agent={entry.agent} state={entry.read ? "think" : "speak"}>
        <span className="text-secondary-foreground">
          {typingLabel(staff[entry.agent], entry.read)}
        </span>
        {entry.preview && (
          <span className="max-w-150 truncate text-muted-foreground">
            {entry.preview}
          </span>
        )}
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
      {attachments.map((attachment) => {
        const href = attachmentHref(attachment);
        const chip = {
          icon: <AttachmentIcon kind={attachment.kind} />,
          label: attachment.title,
          meta: attachmentDate(attachment.date),
        };
        return (
          <li
            key={`${attachment.kind}-${attachment.id}`}
            className="flex max-w-full"
          >
            {href ? (
              <ContextChipLink href={href} {...chip} />
            ) : (
              <ContextChipStatic {...chip} />
            )}
          </li>
        );
      })}
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
  const highlight = useHighlight(entry.itemId);
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
      <div
        {...searchMark(entry.itemId, highlight)}
        className="rounded-lg border border-border bg-muted px-3 py-2 whitespace-pre-wrap"
      >
        <Highlighted text={entry.text} highlight={highlight} />
        <SentChips attachments={entry.attachments} />
      </div>
      <span className="text-label text-muted-foreground tabular-nums">
        {timeLabel(entry.at, timeZone)}
      </span>
    </div>
  );
}

function FailedAthleteMessage({
  message,
  busy,
  onRetry,
  onDelete,
}: {
  message: FailedMessage;
  busy: boolean;
  onRetry: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex max-w-[84%] flex-col items-end gap-1 self-end sm:max-w-[72%]">
      <div className="rounded-lg border border-border bg-muted px-3 py-2 whitespace-pre-wrap opacity-70">
        {message.text}
        <SentChips attachments={message.attachments} />
      </div>
      <span className="flex items-center gap-2.5 text-label">
        <Status level="watch">Non envoyé</Status>
        <Button
          type="button"
          variant="link"
          disabled={busy}
          onClick={onRetry}
          className="h-auto p-0 text-label"
        >
          Réessayer
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={onDelete}
          className="h-auto p-0 text-label font-normal text-secondary-foreground"
        >
          Supprimer
        </Button>
      </span>
      {message.reason && (
        <span className="text-label text-muted-foreground">
          {message.reason}
        </span>
      )}
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
  failed = [],
  onRetryFailed,
  onDeleteFailed,
  revisableId = null,
  onRevise,
  search = null,
}: {
  entries: ThreadEntry[];
  failed?: readonly FailedMessage[];
  onRetryFailed?: (message: FailedMessage) => void;
  onDeleteFailed?: (message: FailedMessage) => void;
  revisableId?: string | null;
  onRevise?: (toolUseId: string, text: string) => void;
  search?: ThreadSearch;
  pending: { text: string; attachments: SentAttachment[] } | null;
  timeZone: string;
  now: Date;
  busy: boolean;
  onAnswer: (text: string) => void;
  onOther: () => void;
  onRetry?: () => void;
}) {
  return (
    <SearchContext value={search}>
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
              ) : entry.type === "topic_summary" ? (
                <TopicSummaryMessage entry={entry} timeZone={timeZone} />
              ) : entry.type === "typing" ? (
                <TypingMessage entry={entry} />
              ) : (
                <StaffMessage
                  entry={entry}
                  timeZone={timeZone}
                  onAnswer={onAnswer}
                  onOther={onOther}
                  onRetry={
                    index === entries.length - 1 && !pending
                      ? onRetry
                      : undefined
                  }
                  revisableId={revisableId}
                  onRevise={onRevise}
                  busy={busy}
                />
              )}
            </div>
          );
        })}
        {failed.map((message) => (
          <FailedAthleteMessage
            key={message.key}
            message={message}
            busy={busy}
            onRetry={() => onRetryFailed?.(message)}
            onDelete={() => onDeleteFailed?.(message)}
          />
        ))}
        {pending && (
          <div className="flex max-w-[84%] flex-col self-end rounded-lg border border-border bg-muted px-3 py-2 whitespace-pre-wrap opacity-70">
            {pending.text}
            <SentChips attachments={pending.attachments} />
            <span className="sr-only">Envoi en cours</span>
          </div>
        )}
      </div>
    </SearchContext>
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
