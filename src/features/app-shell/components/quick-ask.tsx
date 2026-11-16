"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { CornerDownRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Composer } from "@/app/(app)/coach/_components/composer";
import {
  StaffWorking,
  ThreadLog,
} from "@/app/(app)/coach/_components/thread-view";
import { displayTimeZone, localToday } from "@/features/app-shell/shell";
import type { AttachmentRef } from "@/features/coach/attachments";
import { useCoachContext } from "@/features/coach/components/coach-context";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  hasExchange,
  quickAskHeading,
  quickAskItems,
  quickAskNote,
  quickAskScreen,
  quickAskSuggestions,
} from "@/features/coach/quick-ask";
import { suggestedReplies } from "@/features/coach/suggested-replies";
import { coachContextHref } from "@/features/coach/request";
import { buildThread } from "@/features/coach/thread";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  loadQuickAskData,
  type QuickAskData,
} from "@/server/coaching/quick-ask";
import { useQuickAskExchange } from "./use-quick-ask";

type Requests = { count: number; request: () => void };

const QuickAskRequests = createContext<Requests | null>(null);

export function QuickAskProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const request = useCallback(() => setCount((current) => current + 1), []);
  const value = useMemo(() => ({ count, request }), [count, request]);
  return <QuickAskRequests value={value}>{children}</QuickAskRequests>;
}

export function useRequestQuickAsk() {
  return useContext(QuickAskRequests)?.request ?? null;
}

function emptyData(): QuickAskData {
  return {
    today: localToday(new Date()),
    options: { session: [], activity: [], race: [] },
    attached: [],
  };
}

function Suggestions({
  kind,
  onPick,
}: {
  kind: AttachmentRef["kind"] | null;
  onPick: (question: string) => void;
}) {
  return (
    <section aria-label="Questions fréquentes" className="px-2 pb-2">
      <h3 className="px-2.5 pt-1 pb-1.5 text-label font-medium text-muted-foreground">
        {quickAskHeading(kind)}
      </h3>
      <ul className="flex flex-col">
        {quickAskSuggestions(kind).map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left hover:bg-muted focus-visible:bg-muted md:min-h-9"
            >
              <CornerDownRightIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickAskBody({
  quick,
  title,
  close,
  screen,
  context,
  data,
  onNavigate,
}: {
  quick: ReturnType<typeof useQuickAskExchange>;
  title: React.ReactNode;
  close: React.ReactNode;
  screen: string;
  context: AttachmentRef | null;
  data: QuickAskData | null;
  onNavigate: () => void;
}) {
  const { exchange, busy } = quick;
  const started = hasExchange(exchange);
  const kind = context?.kind ?? null;
  const entries = useMemo(
    () =>
      buildThread({
        items: quickAskItems(exchange.items),
        live: busy,
        pendingToolUseId: exchange.pendingQuestion,
      }),
    [exchange.items, exchange.pendingQuestion, busy],
  );
  const replies = suggestedReplies({
    mode: "conversation",
    busy,
    closed: false,
    questionPending: exchange.pendingQuestion !== null,
    status: busy ? "working" : null,
    items: exchange.items,
  });
  const ready = data !== null;
  useEffect(() => {
    if (!ready) return;
    const frame = window.requestAnimationFrame(() =>
      document.getElementById("coach-composer")?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [ready, started]);

  const answeringAgent = exchange.pendingQuestion !== null;
  const placeholder = answeringAgent
    ? "Ta réponse…"
    : busy
      ? "Écris pendant que le staff répond…"
      : "Écris au staff…";

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-3.5 py-3">
        {title}
        <span className="text-label text-muted-foreground">
          depuis {screen}
        </span>
        {close}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {started && (
          <ThreadLog
            entries={entries}
            pending={exchange.pending}
            timeZone={displayTimeZone}
            now={new Date()}
            busy={busy}
            onAnswer={(text) =>
              void quick.submit({ text, consult: null, attachments: [] })
            }
            onOther={() => document.getElementById("coach-composer")?.focus()}
          />
        )}
        {busy && (
          <StaffWorking
            composingSince={exchange.composingSince}
            now={new Date()}
          />
        )}
        {data ? (
          <Composer
            key={started ? "follow-up" : "first"}
            placeholder={placeholder}
            answering={answeringAgent}
            working={busy}
            stopping={quick.stopping}
            initialText=""
            initialAttachments={started ? [] : data.attached}
            replies={replies}
            options={data.options}
            today={data.today}
            help={false}
            notice={quick.notice}
            restore={quick.restore}
            onSend={quick.submit}
            onStop={quick.stop}
            className={cn(started ? "" : "md:border-t-0")}
          />
        ) : (
          <div
            role="status"
            aria-label="Chargement du contexte"
            className="m-3.5 h-11 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
          />
        )}
        {!started && data && (
          <Suggestions
            kind={kind}
            onPick={(text) =>
              void quick.submit({
                text,
                consult: null,
                attachments: data.attached,
              })
            }
          />
        )}
      </div>
      <footer className="flex items-center gap-3 border-t border-border px-3.5 py-2.5">
        <p className="text-label text-muted-foreground">
          {started ? "Gardé dans le fil principal." : quickAskNote(kind)}
        </p>
        <Link
          href={started ? "/coach" : coachContextHref(context)}
          onClick={onNavigate}
          className="ml-auto font-medium whitespace-nowrap text-primary hover:underline"
        >
          {started ? "Continuer dans le Coach" : "Ouvrir le Coach"}
        </Link>
      </footer>
    </>
  );
}

export function QuickAsk() {
  const requests = useContext(QuickAskRequests);
  const pathname = usePathname();
  const pageContext = useCoachContext();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(requests?.count ?? 0);
  const [opened, setOpened] = useState<{
    screen: string;
    context: AttachmentRef | null;
  }>({ screen: "", context: null });
  const [data, setData] = useState<QuickAskData | null>(null);
  const quick = useQuickAskExchange();

  if (requests && seen !== requests.count) {
    setSeen(requests.count);
    if (!open) {
      setOpen(true);
      setData(null);
      quick.reopen();
      setOpened({ screen: quickAskScreen(pathname), context: pageContext });
    }
  }

  const { markSeen } = quick;
  const finished = quick.exchange.finished;
  useEffect(() => {
    if (open && finished) markSeen();
  }, [open, finished, markSeen]);

  const { context } = opened;
  useEffect(() => {
    if (!open) return;
    let current = true;
    loadQuickAskData({ context })
      .then((loaded) => {
        if (current) setData(loaded ?? emptyData());
      })
      .catch(() => {
        if (current) setData(emptyData());
      });
    return () => {
      current = false;
    };
  }, [open, context]);

  const close = () => setOpen(false);
  const body = (title: React.ReactNode, dismiss: React.ReactNode) => (
    <QuickAskBody
      quick={quick}
      title={title}
      close={dismiss}
      screen={opened.screen}
      context={context}
      data={data}
      onNavigate={close}
    />
  );
  const dismissButton = (
    <Button variant="ghost" size="sm" className="ml-auto">
      Fermer
      <Kbd className="max-md:hidden">Échap</Kbd>
    </Button>
  );

  if (mobile)
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="max-h-[90svh] gap-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetDescription className="sr-only">
            Pose une question au staff : l’échange est gardé dans le fil
            principal.
          </SheetDescription>
          {body(
            <SheetTitle className="text-body font-semibold">
              Demander au staff
            </SheetTitle>,
            <SheetClose asChild>{dismissButton}</SheetClose>,
          )}
        </SheetContent>
      </Sheet>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex max-h-[calc(100svh-8rem)] flex-col gap-0 overflow-hidden rounded-xl bg-background p-0 sm:top-24 sm:max-w-155 sm:translate-y-0"
      >
        <DialogDescription className="sr-only">
          Pose une question au staff : l’échange est gardé dans le fil
          principal.
        </DialogDescription>
        {body(
          <DialogTitle className="text-body font-semibold">
            Demander au staff
          </DialogTitle>,
          <DialogClose asChild>{dismissButton}</DialogClose>,
        )}
      </DialogContent>
    </Dialog>
  );
}
