"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { ContextChip } from "@/components/stride/context-chip";
import { SuggestedReplies } from "@/components/stride/suggested-reply";
import { localToday } from "@/features/app-shell/shell";
import {
  attachmentDate,
  attachmentRefs,
  toggleAttachment,
  type AttachmentOption,
  type AttachmentOptions,
  type SentAttachment,
} from "@/features/coach/attachments";
import { AttachmentIcon } from "@/features/coach/components/attachment-icon";
import {
  closedStates,
  sameDay,
  threadStatus,
  type SessionState,
} from "@/features/coach/conversations";
import type { ThreadItem } from "@/features/coach/items";
import {
  StaffAvatar,
  StaffStack,
} from "@/features/coach/components/staff-avatar";
import { staff as allStaff } from "@/features/coach/staff";
import { refusalText, splitFrames, turnFailure } from "@/features/coach/stream";
import {
  currentResultIndex,
  filterResults,
  resultHref,
  searchHref,
  searchQuery,
  stepResult,
  type SearchParams,
  type SearchResult,
  type SearchScope,
} from "@/features/coach/search";
import { suggestedReplies } from "@/features/coach/suggested-replies";
import { buildThread, retryableMessage } from "@/features/coach/thread";
import {
  topicCompanions,
  topicDecisions,
  topicLead,
  topicMessageCount,
  topicOpenedLine,
  type TopicSummary,
} from "@/features/coach/topics";
import { markCoachThreadsRead } from "@/server/coaching/actions";
import type { CoachMainData, CoachTopicData } from "@/server/coaching/threads";
import { CoachHeaderNav } from "./coach-tabs";
import { SearchBar, SearchPanel, type CoachSearchState } from "./coach-search";
import { ContextPicker } from "./context-picker";
import { NewTopicDialog, type DraftTopic } from "./new-topic-dialog";
import { SuiviPanel } from "./suivi-panel";
import { TopicAside } from "./topic-aside";
import { CloseTopicDialog, TopicActions } from "./topic-actions";
import { TopicList } from "./topic-list";
import { StaffWorking, ThreadLog, type ThreadSearch } from "./thread-view";

type Target =
  | { kind: "main" }
  | { kind: "topic"; threadId: string }
  | { kind: "new_topic"; title: string; raceId: string | null };

type Conversation = {
  key: string;
  target: Target;
  threadId: string | null;
  mode: "conversation" | "plan";
  title: string | null;
  raceId: string | null;
  createdAt: string | null;
  closedAt: string | null;
  state: SessionState | null;
  pendingToolUseId: string | null;
  lastTurnAt: string | null;
  composingSince: string | null;
  readIds: string[];
  items: ThreadItem[];
  proposalStatuses: Record<string, string>;
};

export type CoachView =
  | { kind: "main"; data: CoachMainData }
  | { kind: "topic"; data: CoachTopicData };

type Live = {
  base: ThreadItem[];
  items: ThreadItem[];
};

const noItems: ThreadItem[] = [];
const noStatuses: Record<string, string> = {};

function mergeLive(live: Live, base: ThreadItem[]): Live {
  if (live.base === base) return live;
  if (live.base[0]?.id !== base[0]?.id) return { base, items: [] };
  const grown = base.length - live.base.length;
  return {
    base,
    items:
      grown >= live.items.length ? [] : live.items.slice(Math.max(0, grown)),
  };
}

function conversationOf(
  view: CoachView,
  draft: { mode: "conversation" | "plan" },
  draftTopic: DraftTopic | null,
): Conversation {
  if (draftTopic)
    return {
      key: "draft-topic",
      target: {
        kind: "new_topic",
        title: draftTopic.title,
        raceId: draftTopic.raceId,
      },
      threadId: null,
      mode: "conversation",
      title: draftTopic.title,
      raceId: draftTopic.raceId,
      createdAt: null,
      closedAt: null,
      state: null,
      pendingToolUseId: null,
      lastTurnAt: null,
      composingSince: null,
      readIds: [],
      items: noItems,
      proposalStatuses: noStatuses,
    };
  if (view.kind === "topic")
    return {
      key: view.data.id,
      target: { kind: "topic", threadId: view.data.id },
      threadId: view.data.id,
      mode: view.data.mode,
      title: view.data.title,
      raceId: view.data.raceId,
      createdAt: view.data.createdAt,
      closedAt: view.data.closedAt,
      state: view.data.state,
      pendingToolUseId: view.data.pendingToolUseId,
      lastTurnAt: view.data.lastTurnAt,
      composingSince: view.data.composingSince,
      readIds: view.data.unread ? [view.data.id] : [],
      items: view.data.items,
      proposalStatuses: view.data.proposalStatuses,
    };
  return {
    key: "main",
    target: { kind: "main" },
    threadId: view.data.threadId,
    mode: draft.mode,
    title: null,
    raceId: null,
    createdAt: null,
    closedAt: null,
    state: view.data.state,
    pendingToolUseId: view.data.pendingToolUseId,
    lastTurnAt: view.data.lastTurnAt,
    composingSince: view.data.composingSince,
    readIds: view.data.unreadIds,
    items: view.data.items,
    proposalStatuses: view.data.proposalStatuses,
  };
}

function topicsCountLabel(count: number) {
  if (count === 0) return "Sujets";
  return count === 1 ? "1 sujet" : `${count} sujets`;
}

function ClosedNotice({
  conversation,
  busy,
}: {
  conversation: Conversation;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const limit = conversation.closedAt === null;
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-2 border-t border-border px-4 py-4 md:px-5">
      <p className="text-secondary-foreground">
        {limit
          ? "Ce sujet a atteint sa limite. Clos-le pour garder son résumé et ses décisions dans le fil principal."
          : "Ce sujet est clos. Il reste lisible ; écris dans le fil principal pour continuer."}
      </p>
      {limit && conversation.threadId ? (
        <>
          <Button
            variant="outline"
            className="self-start"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Clore le sujet
          </Button>
          <CloseTopicDialog
            threadId={conversation.threadId}
            open={confirming}
            onOpenChange={setConfirming}
          />
        </>
      ) : (
        <Button asChild variant="outline" className="self-start">
          <Link href="/coach">Revenir au fil principal</Link>
        </Button>
      )}
    </div>
  );
}

function Composer({
  placeholder,
  answering,
  busy,
  initialText,
  initialAttachments,
  replies,
  options,
  today,
  onSend,
}: {
  placeholder: string;
  answering: boolean;
  busy: boolean;
  initialText: string;
  initialAttachments: AttachmentOption[];
  replies: readonly string[];
  options: AttachmentOptions;
  today: string;
  onSend: (
    text: string,
    consult: boolean,
    attachments: SentAttachment[],
  ) => Promise<boolean>;
}) {
  const staff = allStaff;
  const [text, setText] = useState(initialText);
  const [consult, setConsult] = useState(false);
  const [attachments, setAttachments] =
    useState<AttachmentOption[]>(initialAttachments);
  const [pickerOpen, setPickerOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const contextTrigger = useRef<HTMLButtonElement>(null);

  async function submit() {
    const message = text.trim();
    if (!message || busy) return;
    const attached = answering ? [] : attachments;
    setText("");
    if (!answering) setAttachments([]);
    const sent = await onSend(message, consult && !answering, attached);
    if (sent) setConsult(false);
    else {
      setText(message);
      if (!answering) setAttachments(attached);
    }
  }

  async function reply(message: string) {
    if (busy) return;
    const sent = await onSend(message, false, []);
    if (!sent) setText((current) => (current.trim() ? current : message));
  }

  function remove(option: AttachmentOption) {
    setAttachments((current) => toggleAttachment(current, option));
    input.current?.focus();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="mx-auto flex w-full max-w-180 flex-col gap-2.5 border-t border-border bg-background px-4 pt-3 pb-3 md:bg-transparent md:px-5 md:pb-4"
    >
      <SuggestedReplies
        replies={replies}
        onSelect={(message) => void reply(message)}
        className="max-sm:-mx-4 max-sm:px-4"
      />
      <InputGroup className="h-auto flex-wrap rounded-lg bg-card p-1 has-[>[data-align=block-start]]:flex-row md:h-auto">
        {!answering && attachments.length > 0 && (
          <InputGroupAddon
            align="block-start"
            className="cursor-default px-0.5 pt-0.5 pb-1"
          >
            <ul
              aria-label="Contexte joint au message"
              className="flex min-w-0 gap-1.5 max-md:overflow-x-auto md:flex-wrap"
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
                    disabled={busy}
                  />
                </li>
              ))}
            </ul>
          </InputGroupAddon>
        )}
        {!answering && (
          <InputGroupAddon align="inline-start" className="self-end pl-0">
            <Button
              ref={contextTrigger}
              type="button"
              variant="ghost"
              aria-label="Ajouter du contexte : séance, activité ou course"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              disabled={busy}
              onClick={() => setPickerOpen(true)}
              className="size-control-touch p-0 text-secondary-foreground md:h-control md:w-auto md:px-2 md:font-normal"
            >
              <PlusIcon aria-hidden="true" />
              <span aria-hidden="true" className="max-md:hidden">
                Contexte
              </span>
            </Button>
          </InputGroupAddon>
        )}
        <InputGroupTextarea
          ref={input}
          id="coach-composer"
          aria-label={answering ? "Ta réponse au staff" : "Écrire au staff"}
          placeholder={placeholder}
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void submit();
            }
          }}
          className="max-h-40 min-h-10 min-w-0 flex-1 basis-0 py-2.5"
        />
        <InputGroupAddon align="inline-end" className="gap-1.5 self-end pr-0">
          {!answering && (
            <Toggle
              variant="choice"
              pressed={consult}
              onPressedChange={setConsult}
              aria-label={`Mentionner ${staff.medical.name}`}
              disabled={busy}
              className="min-h-control-touch gap-1.5 rounded-md border-transparent bg-transparent pr-2 pl-1 font-normal text-secondary-foreground data-[state=on]:border-transparent data-[state=on]:bg-accent data-[state=on]:font-medium data-[state=on]:text-primary md:min-h-control"
            >
              <StaffStack agents={["medical"]} size={22} />@{staff.medical.name}
            </Toggle>
          )}
          <Button
            type="submit"
            disabled={busy || !text.trim()}
            className="min-h-control-touch md:min-h-control"
          >
            Envoyer
          </Button>
        </InputGroupAddon>
      </InputGroup>
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
      <p className="text-label text-muted-foreground max-sm:hidden">
        Le Coach lit chaque message et passe la main au bon spécialiste, deux au
        plus par demande. Les questions d’un spécialiste lui reviennent
        directement. Rien ne change sans ton accord.
      </p>
    </form>
  );
}

function EmptyConversation({ conversation }: { conversation: Conversation }) {
  const staff = allStaff;
  const topic = conversation.target.kind !== "main";
  const plan = conversation.mode === "plan";
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-3 px-4 pt-8 md:px-5 md:pt-12">
      <StaffAvatar agent="coach" size={48} />
      <h2 className="text-verdict font-semibold">
        {topic
          ? conversation.title
          : plan
            ? `Demande ton plan ${staff.coach.to}`
            : "Écris à ton staff"}
      </h2>
      <p className="max-w-140 text-body-lg text-secondary-foreground">
        {topic
          ? "Écris ta première question. Le staff garde le fil de ce sujet jusqu’à ce que tu le closes."
          : plan
            ? `${staff.coach.subject} construit ton plan à partir de tes objectifs, de tes disponibilités et de ton historique, puis te le propose. Rien n’est enregistré sans ton accord.`
            : `Pose ta question sur ton entraînement, ta récupération ou une douleur. ${staff.coach.subject} te répond ou passe la main ${staff.medical.to}, qui te parle directement quand c’est utile.`}
      </p>
    </div>
  );
}

function ConversationPane({
  conversation,
  draftText,
  initialAttachments,
  attachmentOptions,
  race,
  now,
  timeZone,
  topicsBar,
  searchBar,
  searchPanel,
  threadSearch,
  focusId,
}: {
  searchBar: React.ReactNode;
  searchPanel: React.ReactNode;
  threadSearch: ThreadSearch;
  focusId: string | null;
  conversation: Conversation;
  draftText: string;
  initialAttachments: AttachmentOption[];
  attachmentOptions: AttachmentOptions;
  race: { id: string; title: string; date: string | null } | null;
  now: Date;
  timeZone: string;
  topicsBar: (extra: React.ReactNode) => React.ReactNode;
}) {
  const staff = allStaff;
  const router = useRouter();
  const [, startTransition] = useTransition();
  const baseItems = conversation.items;
  const [liveState, setLive] = useState<Live>({ base: baseItems, items: [] });
  const live = mergeLive(liveState, baseItems);
  if (live !== liveState) setLive(live);
  const [threadId, setThreadId] = useState(conversation.threadId);
  const [state, setState] = useState<SessionState | null>(conversation.state);
  const [pendingQuestion, setPendingQuestion] = useState(
    conversation.pendingToolUseId,
  );
  const [lastTurnAt, setLastTurnAt] = useState(conversation.lastTurnAt);
  const [composingSince, setComposingSince] = useState(
    conversation.composingSince,
  );
  const [busy, setBusy] = useState(false);
  const [synced, setSynced] = useState(conversation);
  if (synced !== conversation) {
    setSynced(conversation);
    if (!busy) {
      setThreadId(conversation.threadId);
      setState(conversation.state);
      setPendingQuestion(conversation.pendingToolUseId);
      setLastTurnAt(conversation.lastTurnAt);
      setComposingSince(conversation.composingSince);
    }
  }
  const [clock, setClock] = useState(now);
  const [sending, setSending] = useState<{
    text: string;
    attachments: SentAttachment[];
  } | null>(null);
  const [asideOpen, setAsideOpen] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => [...live.base, ...live.items],
    [live.base, live.items],
  );
  const main = conversation.target.kind === "main";
  const { mode, proposalStatuses } = conversation;
  const status =
    state === null
      ? null
      : threadStatus({
          state: busy
            ? "running"
            : main && closedStates.includes(state)
              ? "idle"
              : state,
          lastTurnAt: busy ? new Date().toISOString() : lastTurnAt,
          now: busy ? new Date() : clock,
          proposalStatuses: Object.values(proposalStatuses).concat(
            items.flatMap((item) =>
              item.kind === "proposal" && !(item.proposalId in proposalStatuses)
                ? ["ready"]
                : [],
            ),
          ),
        });
  const resumed = !busy && status === "working";
  const working = busy || resumed;
  const entries = useMemo(
    () =>
      buildThread({
        items,
        live: working,
        pendingToolUseId: pendingQuestion,
        proposalStatuses,
      }),
    [items, working, pendingQuestion, proposalStatuses],
  );
  const closed =
    !main &&
    (conversation.closedAt !== null ||
      (state !== null && closedStates.includes(state)));
  const retry =
    working || closed || pendingQuestion !== null
      ? null
      : retryableMessage(items);

  const readIds = conversation.readIds;
  useEffect(() => {
    if (readIds.length) void markCoachThreadsRead({ threadIds: readIds });
  }, [readIds]);

  const firstId = items[0]?.id;
  const lastId = items.at(-1)?.id;
  useEffect(() => {
    if (focusId && !sending) {
      scroller.current
        ?.querySelector(`[data-item-id="${focusId}"]`)
        ?.scrollIntoView({ block: "center" });
      return;
    }
    logEnd.current?.scrollIntoView({ block: "end" });
  }, [items.length, firstId, lastId, sending, focusId]);

  useEffect(() => {
    if (!working) return;
    const tick = window.setInterval(() => setClock(new Date()), 5_000);
    return () => window.clearInterval(tick);
  }, [working]);

  useEffect(() => {
    if (!resumed) return;
    const poll = window.setInterval(() => router.refresh(), 4_000);
    return () => window.clearInterval(poll);
  }, [resumed, router]);

  async function send(
    text: string,
    consult: boolean,
    attachments: SentAttachment[] = [],
  ) {
    if (working) return false;
    const answering = pendingQuestion;
    setComposingSince(null);
    setBusy(true);
    setSending({
      text,
      attachments: attachments.map(({ kind, id, title, date }) => ({
        kind,
        id,
        title,
        date,
      })),
    });
    let sent = false;
    let started = false;
    let currentThread = threadId;
    let turnError: string | null = null;
    let errorShown = false;
    let finished = false;
    const target: Target =
      conversation.target.kind === "new_topic" && threadId
        ? { kind: "topic", threadId }
        : conversation.target;
    try {
      const response = await fetch("/api/coach/turns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          mode,
          input: answering
            ? { kind: "answer", toolUseId: answering, text }
            : {
                kind: "message",
                text,
                ...(consult ? { consult: "medical" } : {}),
                ...(attachments.length
                  ? { attachments: attachmentRefs(attachments) }
                  : {}),
              },
        }),
      });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        toast.error(
          refusalText(
            data && typeof data === "object" && "code" in data
              ? data.code
              : null,
          ),
          { id: "coach-turn" },
        );
        setSending(null);
      } else {
        sent = true;
        const reader = response.body
          ?.pipeThrough(new TextDecoderStream())
          .getReader();
        let buffer = "";
        while (reader) {
          const { value, done } = await reader.read();
          if (done) break;
          const { events, rest } = splitFrames(buffer + value);
          buffer = rest;
          for (const event of events) {
            if (event.type === "session") {
              started = true;
              currentThread = event.threadId;
              setThreadId(event.threadId);
              setState("running");
              setLastTurnAt(new Date().toISOString());
            }
            if (event.type === "item") {
              if (event.item.kind === "athlete" || event.item.kind === "answer")
                setSending(null);
              if (event.item.kind === "answer") setPendingQuestion(null);
              if (event.item.kind === "error") errorShown = true;
              setLive((current) => ({
                ...current,
                items: [...current.items, event.item],
              }));
            }
            if (event.type === "question") setPendingQuestion(event.toolUseId);
            if (event.type === "composing") setComposingSince(event.since);
            if (event.type === "error") turnError = event.text;
            if (event.type === "done") {
              finished = true;
              setState(event.status as SessionState);
              if (event.status !== "awaiting_athlete") setPendingQuestion(null);
            }
          }
        }
      }
    } catch {
      if (!started) toast.error(turnFailure, { id: "coach-turn" });
    } finally {
      if (turnError && !errorShown)
        toast.error(turnError, { id: "coach-turn" });
      if (finished) setComposingSince(null);
      setSending(null);
      setBusy(false);
    }
    if (sent && currentThread) {
      void markCoachThreadsRead({ threadIds: [currentThread] });
      const opened = currentThread;
      if (conversation.target.kind === "new_topic")
        startTransition(() => router.replace(`/coach/${opened}`));
      else router.refresh();
    }
    return sent;
  }

  const answeringAgent = pendingQuestion
    ? ([...items]
        .reverse()
        .find(
          (item): item is Extract<ThreadItem, { kind: "question" }> =>
            item.kind === "question" && item.toolUseId === pendingQuestion,
        )?.askedFor ?? "coach")
    : null;
  const placeholder = answeringAgent
    ? `Ta réponse ${staff[answeringAgent].to}…`
    : "Écris au staff…";
  const empty = items.length === 0 && !sending;
  const replies =
    !main && items.length === 0
      ? []
      : suggestedReplies({
          mode,
          busy: working,
          closed,
          questionPending: pendingQuestion !== null,
          status,
          items,
        });

  const lastDay = items.at(-1)?.at ?? null;
  const suiviItems = useMemo(
    () =>
      lastDay === null
        ? items
        : items.filter((item) => sameDay(item.at, lastDay, timeZone)),
    [items, lastDay, timeZone],
  );
  const lead = topicLead(items);
  const asideTitle = main ? "Suivi de la conversation" : "Ce sujet";
  const aside = main ? (
    <SuiviPanel
      items={suiviItems}
      status={status}
      pendingToolUseId={pendingQuestion}
      proposalStatuses={proposalStatuses}
      timeZone={timeZone}
    />
  ) : (
    <TopicAside
      race={race}
      lead={lead}
      companions={topicCompanions(items)}
      decisions={topicDecisions(items, proposalStatuses).length}
      closed={conversation.closedAt !== null}
    />
  );
  const showAside = !main || !empty || searchPanel !== null;
  const asideButton = showAside ? (
    <Button
      variant="outline"
      size="icon"
      aria-label={asideTitle}
      onClick={() => setAsideOpen(true)}
      className="max-md:size-control-touch xl:hidden"
    >
      <ListIcon aria-hidden="true" />
    </Button>
  ) : null;
  const topicMenu =
    !main && threadId ? (
      <TopicActions
        threadId={threadId}
        title={conversation.title ?? ""}
        closed={conversation.closedAt !== null}
        busy={working}
      />
    ) : null;

  return (
    <>
      {searchBar === null &&
        topicsBar(
          <>
            {asideButton}
            {topicMenu && <span className="md:hidden">{topicMenu}</span>}
          </>,
        )}
      <div className="flex min-h-0 flex-1">
        <section
          aria-label={main ? "Fil principal" : (conversation.title ?? "Sujet")}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {searchBar}
          {!main && (
            <div className="flex min-h-header shrink-0 items-center gap-3 border-b border-border px-5 py-2 max-md:hidden">
              <StaffAvatar agent={lead} size={22} decorative />
              <span className="flex min-w-0 flex-1 flex-col">
                <h1 className="truncate font-semibold">{conversation.title}</h1>
                <span className="truncate text-label text-muted-foreground">
                  {conversation.createdAt
                    ? topicOpenedLine(
                        conversation.createdAt,
                        topicMessageCount(items),
                        timeZone,
                      )
                    : "Nouveau sujet"}
                </span>
              </span>
              {topicMenu}
            </div>
          )}
          <div
            ref={scroller}
            className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain"
          >
            {empty ? (
              <EmptyConversation conversation={conversation} />
            ) : (
              <ThreadLog
                entries={entries}
                search={threadSearch}
                pending={sending}
                timeZone={timeZone}
                now={now}
                busy={working}
                onAnswer={(answer) => void send(answer, false)}
                onRetry={
                  retry
                    ? () =>
                        void send(retry.text, retry.consult, retry.attachments)
                    : undefined
                }
                onOther={() =>
                  document.getElementById("coach-composer")?.focus()
                }
              />
            )}
            {working && !entries.some((entry) => entry.type === "typing") && (
              <StaffWorking composingSince={composingSince} now={clock} />
            )}
            <div ref={logEnd} />
          </div>
          {closed ? (
            <ClosedNotice conversation={conversation} busy={working} />
          ) : (
            <Composer
              placeholder={placeholder}
              answering={pendingQuestion !== null}
              busy={working}
              initialText={draftText}
              initialAttachments={initialAttachments}
              replies={replies}
              options={attachmentOptions}
              today={localToday(now)}
              onSend={send}
            />
          )}
        </section>
        {showAside && (
          <aside
            aria-label={searchPanel ? "Résultats de la recherche" : asideTitle}
            className="hidden w-panel shrink-0 overflow-y-auto border-l border-border px-5 py-4.5 xl:block"
          >
            {searchPanel ?? aside}
          </aside>
        )}
      </div>
      <Sheet open={asideOpen} onOpenChange={setAsideOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-h-[85svh] gap-0 overflow-hidden rounded-t-2xl border-control-border bg-background shadow-float min-[640px]:inset-x-auto min-[640px]:right-2 min-[640px]:bottom-2 min-[640px]:w-100 min-[640px]:rounded-xl min-[640px]:border"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <SheetTitle className="font-semibold">{asideTitle}</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="ml-auto min-h-control-touch text-secondary-foreground"
              >
                Fermer
              </Button>
            </SheetClose>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {aside}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TopicsFooter({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-2.5 pt-2.5 pb-1">
      <p className="flex-1 text-label text-muted-foreground">
        Un sujet sert à une question de fond. Pour le reste, écris dans le fil
        principal.
      </p>
      <Button variant="outline" onClick={onNew}>
        Nouveau sujet
      </Button>
    </div>
  );
}

export function CoachScreen({
  view,
  topics,
  mainActivityAt,
  draft,
  now: nowIso,
  timeZone,
  attachmentOptions,
  initialAttachments = [],
  search,
}: {
  view: CoachView;
  topics: TopicSummary[];
  mainActivityAt: string | null;
  draft: { mode: "conversation" | "plan"; text: string };
  now: string;
  timeZone: string;
  attachmentOptions: AttachmentOptions;
  initialAttachments?: AttachmentOption[];
  search: SearchParams & { results: SearchResult[] };
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const router = useRouter();
  const [, startSearchTransition] = useTransition();
  const searchTopicId = view.kind === "topic" ? view.data.id : null;
  const urlKey = [
    searchTopicId,
    search.open,
    search.query,
    search.at,
    search.scopes.join(","),
    search.date,
  ].join("|");
  const [localOpen, setLocalOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [pending, setPending] = useState<{
    at?: string;
    scopes?: SearchScope[];
  } | null>(null);
  const [seenKey, setSeenKey] = useState(urlKey);
  if (seenKey !== urlKey) {
    setSeenKey(urlKey);
    setPending(null);
    if (!search.open) setClosing(false);
  }
  const lastHref = useRef<string | null>(null);
  const restoreFocus = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const desktopTrigger = useRef<HTMLButtonElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const searchOpen = (search.open && !closing) || localOpen;
  const searchScopes = pending?.scopes ?? search.scopes;
  const highlightQuery = searchQuery(search.query);
  const searchResults = useMemo(
    () => filterResults(search.results, searchScopes),
    [search.results, searchScopes],
  );
  const searchIndex = currentResultIndex(
    searchResults,
    pending?.at ?? search.at,
  );
  const currentResult = searchResults[searchIndex] ?? null;

  const go = useCallback(
    (href: string) => {
      if (lastHref.current === href) return;
      lastHref.current = href;
      startSearchTransition(() => router.replace(href, { scroll: false }));
    },
    [router],
  );

  useEffect(() => {
    lastHref.current = null;
  }, [urlKey]);

  useEffect(() => {
    if (
      !searchOpen ||
      !currentResult ||
      (currentResult.id === search.at &&
        currentResult.topicId === searchTopicId)
    )
      return;
    go(resultHref(currentResult, search.query, searchScopes));
  }, [
    searchOpen,
    currentResult,
    search.at,
    search.query,
    searchScopes,
    searchTopicId,
    go,
  ]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== "f"
      )
        return;
      event.preventDefault();
      setLocalOpen(true);
      setClosing(false);
      setFocusTick((tick) => tick + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (focusTick === 0) return;
    searchInput.current?.focus();
    searchInput.current?.select();
  }, [focusTick]);

  useEffect(() => {
    if (!restoreFocus.current || searchOpen) return;
    restoreFocus.current = false;
    [desktopTrigger.current, mobileTrigger.current]
      .find((trigger) => trigger && trigger.offsetParent !== null)
      ?.focus();
  }, [searchOpen]);

  function openSearch() {
    setLocalOpen(true);
    setClosing(false);
    setFocusTick((tick) => tick + 1);
  }

  function closeSearch() {
    setLocalOpen(false);
    restoreFocus.current = true;
    if (search.open) {
      setClosing(true);
      go(searchTopicId ? `/coach/${searchTopicId}` : "/coach");
    }
  }

  function stepSearch(direction: "older" | "newer") {
    const target = stepResult(searchResults, searchIndex, direction);
    if (!target) return;
    setPending((current) => ({ ...current, at: target.id }));
    go(resultHref(target, search.query, searchScopes));
  }

  const searchState: CoachSearchState = {
    query: search.query,
    valid: highlightQuery !== null,
    scopes: searchScopes,
    results: highlightQuery ? searchResults : [],
    index: highlightQuery ? searchIndex : -1,
    date: search.date,
  };
  const threadSearch: ThreadSearch =
    searchOpen && highlightQuery
      ? {
          query: highlightQuery,
          currentId: currentResult?.id ?? null,
          matchIds: new Set(searchResults.map((result) => result.id)),
        }
      : null;
  const focusId = !searchOpen
    ? null
    : search.date
      ? view.data.anchorId
      : currentResult && currentResult.topicId === searchTopicId
        ? currentResult.id
        : null;
  const [draftTopic, setDraftTopic] = useState<DraftTopic | null>(null);
  const [creating, setCreating] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const conversation = useMemo(
    () => conversationOf(view, draft, draftTopic),
    [view, draft, draftTopic],
  );
  const currentId = view.kind === "topic" && !draftTopic ? view.data.id : null;
  const openTopics = topics.filter((topic) => topic.closedAt === null).length;
  const title =
    conversation.target.kind === "main"
      ? "Fil principal"
      : (conversation.title ?? "Sujet");
  const raceOption = conversation.raceId
    ? (attachmentOptions.race.find(
        (option) => option.id === conversation.raceId,
      ) ?? null)
    : null;
  const race = raceOption
    ? { id: raceOption.id, title: raceOption.title, date: raceOption.date }
    : null;

  function startTopic() {
    setListOpen(false);
    setSheetOpen(false);
    setCreating(true);
  }

  const list = (onNavigate: () => void) => (
    <TopicList
      topics={topics}
      current={draftTopic ? "draft" : currentId}
      mainActivityAt={mainActivityAt}
      now={now}
      timeZone={timeZone}
      onNavigate={() => {
        setDraftTopic(null);
        onNavigate();
      }}
    />
  );

  return (
    <>
      <AppHeader
        title="Coach"
        detail={conversation.target.kind === "main" ? "ton staff" : "sujet"}
        breadcrumb={
          conversation.target.kind === "main" ? (
            <CoachHeaderNav />
          ) : (
            <nav
              aria-label="Fil d’Ariane"
              className="flex min-w-0 items-center gap-2"
            >
              <Link
                href="/coach"
                onClick={() => setDraftTopic(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                Coach
              </Link>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span aria-current="page" className="truncate font-semibold">
                {title}
              </span>
            </nav>
          )
        }
        actions={
          <div className="flex items-center gap-2 max-md:hidden">
            <Button
              ref={desktopTrigger}
              variant="ghost"
              aria-keyshortcuts="Meta+F Control+F"
              onClick={openSearch}
              className={cn(searchOpen && "bg-muted text-foreground")}
            >
              Rechercher
              <Kbd aria-hidden="true">⌘F</Kbd>
            </Button>
            <Popover open={listOpen} onOpenChange={setListOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  Sujets
                  {openTopics > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      {openTopics}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label="Sujets"
                className="max-h-[min(36rem,80svh)] w-104 gap-1 overflow-y-auto p-1.5"
              >
                {list(() => setListOpen(false))}
                <TopicsFooter onNew={startTopic} />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" onClick={startTopic}>
              Nouveau sujet
            </Button>
          </div>
        }
      />
      <ConversationPane
        key={conversation.key}
        conversation={conversation}
        draftText={view.kind === "main" && !draftTopic ? draft.text : ""}
        initialAttachments={
          view.kind === "main" && !draftTopic ? initialAttachments : []
        }
        attachmentOptions={attachmentOptions}
        race={race}
        now={now}
        timeZone={timeZone}
        threadSearch={threadSearch}
        focusId={focusId}
        searchBar={
          searchOpen ? (
            <SearchBar
              search={searchState}
              inputRef={searchInput}
              today={localToday(now)}
              onQuery={(query) =>
                go(
                  searchHref({
                    topicId: searchTopicId,
                    query,
                    scopes: searchScopes,
                  }),
                )
              }
              onStep={stepSearch}
              onDate={(date) =>
                go(
                  searchHref({
                    topicId: searchTopicId,
                    query: search.query,
                    scopes: searchScopes,
                    at: search.at,
                    date,
                  }),
                )
              }
              onClose={closeSearch}
            />
          ) : null
        }
        searchPanel={
          searchOpen ? (
            <SearchPanel
              search={searchState}
              topics={topics}
              now={now}
              timeZone={timeZone}
              onScopes={(scopes) => {
                setPending((current) => ({ ...current, scopes }));
                go(
                  searchHref({
                    topicId: searchTopicId,
                    query: search.query,
                    scopes,
                    at: search.at,
                  }),
                );
              }}
              onOpen={(result) =>
                setPending((current) => ({ ...current, at: result.id }))
              }
              onClose={closeSearch}
            />
          ) : null
        }
        topicsBar={(extra) => (
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 md:hidden">
            <Button
              variant="outline"
              aria-haspopup="dialog"
              onClick={() => setSheetOpen(true)}
              className="min-w-0 flex-1 justify-between font-normal"
            >
              <span className="truncate font-medium">{title}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {topicsCountLabel(openTopics)}
                <ChevronDownIcon aria-hidden="true" />
              </span>
            </Button>
            <Button
              ref={mobileTrigger}
              variant="outline"
              size="icon"
              aria-label="Rechercher"
              onClick={openSearch}
              className="max-md:size-control-touch"
            >
              <SearchIcon aria-hidden="true" />
            </Button>
            {extra}
          </div>
        )}
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-h-[85svh] gap-0 overflow-hidden rounded-t-2xl border-control-border bg-background shadow-float"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <SheetTitle className="font-semibold">Sujets</SheetTitle>
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="ml-auto min-h-control-touch text-secondary-foreground"
              >
                Fermer
              </Button>
            </SheetClose>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
            {list(() => setSheetOpen(false))}
          </div>
          <div className="flex flex-col gap-2 border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button size="lg" onClick={startTopic}>
              Nouveau sujet
            </Button>
            <Link
              href="/coach/team"
              onClick={() => setSheetOpen(false)}
              className="inline-flex min-h-control-touch items-center justify-center text-secondary-foreground hover:text-foreground"
            >
              Voir le staff
            </Link>
          </div>
        </SheetContent>
      </Sheet>
      <NewTopicDialog
        open={creating}
        onOpenChange={setCreating}
        races={attachmentOptions.race}
        onOpenTopic={setDraftTopic}
      />
    </>
  );
}
