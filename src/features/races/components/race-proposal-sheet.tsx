"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { MonoLabel } from "@/components/stride/mono-label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { changeCountLabel } from "@/features/races/proposals";
import type { RaceProposalReview } from "@/features/races/proposal-review";
import {
  acceptRaceProposal,
  rejectRaceProposal,
  type RaceProposalActionResult,
} from "@/server/races/proposal-actions";

const outcomes: Partial<Record<RaceProposalActionResult["status"], string>> = {
  accepted: "Proposition appliquée.",
  rejected: "Proposition refusée.",
};

const failures: Partial<Record<RaceProposalActionResult["status"], string>> = {
  stale:
    "Cette proposition ne s’applique plus : la course a changé depuis. Demande une nouvelle proposition.",
  closed: "Cette proposition a déjà été traitée.",
  invalid: "Cette proposition est introuvable.",
  error: "Ta décision n’a pas pu être enregistrée. Réessaie dans un instant.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour décider.",
};

function ChangeList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "before" | "after";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <MonoLabel size="nano">{label}</MonoLabel>
      {items.length ? (
        <ul
          className={cn(
            "flex flex-col gap-1 text-meta leading-normal",
            tone === "before" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <span className="text-meta text-muted-foreground">Aucun</span>
      )}
    </div>
  );
}

export function RaceProposalSheet({ review }: { review: RaceProposalReview }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"accept" | "reject" | null>(null);
  const decidable = review.status === "ready";

  const close = useCallback(() => {
    setOpen(false);
    const query = new URLSearchParams(searchParams);
    query.delete("proposal");
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  function run(kind: "accept" | "reject") {
    setRunning(kind);
    startTransition(async () => {
      const action =
        kind === "accept" ? acceptRaceProposal : rejectRaceProposal;
      const result = await action({
        raceId: review.raceId,
        proposalId: review.id,
      });
      const id = `race-proposal-${review.id}`;
      const outcome = outcomes[result.status];
      const failure = failures[result.status];
      if (outcome) toast.success(outcome, { id });
      if (failure) toast.error(failure, { id });
      setRunning(null);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(value) => !value && close()}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        showCloseButton={false}
        aria-describedby={undefined}
        overlayClassName="bg-background/45"
        className={cn(
          "gap-0 overflow-hidden border-border-strong bg-surface-panel text-foreground",
          mobile
            ? "data-[side=bottom]:top-14.5 data-[side=bottom]:rounded-t-[18px]"
            : "rounded-2xl border shadow-[-30px_0_80px_rgba(0,0,0,.55)] data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-140 data-[side=right]:max-w-[calc(100vw-1rem)] data-[side=right]:sm:max-w-140",
        )}
      >
        {mobile && (
          <span
            aria-hidden="true"
            className="mt-2 mb-1 h-1 w-10 self-center rounded-mark bg-border-strong"
          />
        )}
        <header className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
          <span className="flex min-w-0 flex-col gap-0.5">
            <MonoLabel size="micro">{review.kicker}</MonoLabel>
            <span className="truncate text-meta text-secondary-foreground">
              {changeCountLabel(review.changes.length)}
            </span>
          </span>
          <MonoLabel
            size="micro"
            className={cn(
              "ml-auto text-right",
              decidable ? "text-warning" : "text-secondary-foreground",
            )}
          >
            {review.statusLabel}
          </MonoLabel>
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fermer"
              className="size-8.5 rounded-md border-border text-secondary-foreground hover:text-foreground max-sm:size-11"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </SheetClose>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-5 pb-6 sm:px-5.5">
          <div className="flex flex-col gap-2">
            <SheetTitle className="text-headline font-semibold">
              {review.title}
            </SheetTitle>
            {review.summary && (
              <p className="text-sm leading-normal text-secondary-foreground">
                {review.summary}
              </p>
            )}
          </div>
          <ol className="flex flex-col border-t border-border">
            {review.changes.map((change) => (
              <li
                key={change.key}
                className="flex flex-col gap-2.5 border-b border-border py-3.5"
              >
                <span className="text-body font-semibold">{change.label}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChangeList
                    label="Actuel"
                    items={change.before}
                    tone="before"
                  />
                  <ChangeList
                    label="Proposé"
                    items={change.after}
                    tone="after"
                  />
                </div>
              </li>
            ))}
          </ol>
          {review.changes.length === 0 && (
            <p className="text-meta text-muted-foreground">
              Cette proposition ne change rien à ton plan actuel.
            </p>
          )}
        </div>
        {decidable && (
          <footer
            className={cn(
              "flex gap-2 border-t border-border-subtle bg-surface-inset px-4 py-3.5",
              mobile
                ? "flex-col pb-[max(0.875rem,env(safe-area-inset-bottom))]"
                : "flex-row items-center",
            )}
          >
            <Button
              size="md"
              className={cn("h-11 px-4.5", mobile && "w-full")}
              disabled={pending}
              aria-busy={running === "accept"}
              onClick={() => run("accept")}
            >
              {running === "accept" ? "Application…" : "Accepter"}
            </Button>
            <Button
              variant="outline"
              size="md"
              className={cn("h-11", mobile && "w-full")}
              disabled={pending}
              aria-busy={running === "reject"}
              onClick={() => run("reject")}
            >
              Refuser
            </Button>
            <span
              className={cn(
                "text-xs text-muted-foreground",
                mobile ? "text-center" : "ml-auto max-w-55 text-right",
              )}
            >
              Rien ne change tant que tu n’as pas accepté.
            </span>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
