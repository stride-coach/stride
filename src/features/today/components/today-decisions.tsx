"use client";

import { useTransition, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  reportDecision,
  type DecisionFailures,
  type MoveMessages,
} from "@/features/today/components/report-decision";
import {
  acceptProposal,
  moveSession,
  rejectProposal,
  type ProposalActionResult,
} from "@/server/plans/actions";
import type { MoveDay } from "@/features/plans/schedule/week-moves";

const failures: DecisionFailures = {
  error: "Ta décision n’a pas pu être enregistrée. Réessaie dans un instant.",
  pending:
    "Ta décision est enregistrée, mais le plan n’a pas pu être mis à jour. Réessaie depuis Plan.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour décider.",
  "invalid-request": "Cette séance ne peut plus être modifiée.",
};

const moveMessages: MoveMessages = {
  blocked:
    "Ce jour-là, la séance ne respecte pas les règles de Stride. Elle reste aujourd’hui.",
  stale:
    "Ton plan a changé entre-temps : la séance reste aujourd’hui. Recharge la page pour voir la version à jour.",
  pending:
    "Le coach propose déjà un ajustement pour cette séance : décide-le d’abord.",
};

export function TodayDecisions({
  sessionKey,
  plannedTitle,
  proposal,
  moveDays,
  stepsHref,
  children,
}: {
  children?: ReactNode;
  stepsHref: string;
  sessionKey: string;
  plannedTitle: string;
  proposal: { id: string } | null;
  moveDays: MoveDay[];
}) {
  const [pending, startTransition] = useTransition();

  const run = (
    action: () => Promise<ProposalActionResult>,
    success: string,
    move?: MoveMessages,
  ) =>
    startTransition(async () => {
      const result = await action().catch((): ProposalActionResult => ({
        status: "error",
      }));
      reportDecision(result, {
        id: "today-decision",
        success,
        failures,
        move,
      });
    });

  return (
    <div
      role="group"
      aria-label="Décider de la séance"
      aria-busy={pending}
      className="flex flex-wrap items-center gap-1.5"
    >
      {proposal && (
        <>
          <Button
            type="button"
            size="md"
            className="flex-1 sm:flex-none"
            disabled={pending}
            onClick={() =>
              run(
                () => acceptProposal({ proposalId: proposal.id }),
                "Proposition appliquée au plan.",
              )
            }
          >
            Accepter
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1 sm:flex-none"
            disabled={pending}
            onClick={() =>
              run(
                () => rejectProposal({ proposalId: proposal.id }),
                `Tu gardes ${plannedTitle}.`,
              )
            }
          >
            Garder {plannedTitle}
          </Button>
        </>
      )}
      {moveDays.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={pending}
            >
              Déplacer
              <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-64">
            <DropdownMenuLabel>Déplacer à</DropdownMenuLabel>
            {moveDays.map((day) => (
              <DropdownMenuItem
                key={day.date}
                onSelect={() =>
                  run(
                    () => moveSession({ sessionKey, toDate: day.date }),
                    `Séance déplacée : ${day.label}.`,
                    moveMessages,
                  )
                }
              >
                <span className="first-letter:uppercase">{day.label}</span>
                <span className="ml-auto pl-3 text-muted-foreground">
                  {day.sessions.length > 0
                    ? day.sessions.join(" · ")
                    : day.restKey
                      ? "Repos"
                      : "Libre"}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {proposal && (
        <Button asChild variant="ghost" size="md">
          <Link href={`/plan?proposal=${proposal.id}`}>Pourquoi ?</Link>
        </Button>
      )}
      {children}
      <Link
        href={stepsHref}
        className="ml-auto rounded-md font-medium text-secondary-foreground hover:text-foreground hover:underline"
      >
        Voir les étapes →
      </Link>
    </div>
  );
}
