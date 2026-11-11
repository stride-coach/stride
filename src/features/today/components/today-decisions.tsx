"use client";

import { useTransition } from "react";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { reasonText } from "@/features/plans/review/proposal";
import {
  acceptProposal,
  moveSession,
  rejectProposal,
  type ProposalActionResult,
} from "@/server/plans/actions";
import type { MoveDay } from "../move";

const failures: Partial<Record<ProposalActionResult["status"], string>> = {
  error: "Ta décision n’a pas pu être enregistrée. Réessaie dans un instant.",
  pending:
    "Ta décision est enregistrée. Le plan se met à jour dans un instant.",
  "session-expired": "Ta session a expiré. Reconnecte-toi pour décider.",
  "invalid-request": "Cette séance ne peut plus être modifiée.",
};

function report(
  result: ProposalActionResult,
  success: string,
  blocked?: string,
) {
  if (result.status === "applied" || result.status === "rejected") {
    toast.success(success, { id: "today-decision" });
    return;
  }
  const text =
    result.status === "invalid" && result.reason === "validation_failed"
      ? (blocked ?? reasonText(result.reason))
      : result.status === "stale" || result.status === "invalid"
        ? reasonText(result.reason)
        : failures[result.status];
  if (text) toast.error(text, { id: "today-decision" });
}

const moveBlocked =
  "Ce jour-là, la séance ne respecte pas les règles de sécurité de Stride. Elle reste aujourd’hui.";

export function TodayDecisions({
  sessionKey,
  plannedTitle,
  proposal,
  moveDays,
}: {
  sessionKey: string;
  plannedTitle: string;
  proposal: { id: string } | null;
  moveDays: MoveDay[];
}) {
  const [pending, startTransition] = useTransition();
  if (!proposal && moveDays.length === 0) return null;

  const run = (
    action: () => Promise<ProposalActionResult>,
    success: string,
    blocked?: string,
  ) =>
    startTransition(async () => {
      const result = await action().catch((): ProposalActionResult => ({
        status: "error",
      }));
      report(result, success, blocked);
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
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Déplacer à</DropdownMenuLabel>
            {moveDays.map((day) => (
              <DropdownMenuItem
                key={day.date}
                onSelect={() =>
                  run(
                    () => moveSession({ sessionKey, toDate: day.date }),
                    `Séance déplacée : ${day.label}.`,
                    moveBlocked,
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
    </div>
  );
}
