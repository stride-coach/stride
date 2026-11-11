import { CheckIcon } from "lucide-react";
import { Chip } from "@/components/stride/chip";
import { cn } from "@/lib/utils";
import {
  messagesLabel,
  staffReads,
  suiviCard,
  suiviParticipants,
  suiviTimeline,
  type ThreadStatus,
} from "@/features/coach/conversations";
import type { ThreadItem } from "@/features/coach/items";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { staff as allStaff, staffAgents } from "@/features/coach/staff";

const panelSection =
  "flex flex-col gap-2.5 border-b border-border py-4.5 first:pt-0 last:border-b-0";
const panelHeading = "text-label font-medium text-muted-foreground";

const dotTone = {
  accent: "bg-primary",
  warning: "bg-warning",
  success: "bg-primary",
  muted: "bg-muted-foreground",
} as const;

export function SuiviPanel({
  items,
  status,
  pendingToolUseId,
  proposalStatuses,
  timeZone,
}: {
  items: readonly ThreadItem[];
  status: ThreadStatus;
  pendingToolUseId: string | null;
  proposalStatuses: Readonly<Record<string, string>>;
  timeZone: string;
}) {
  const staff = allStaff;
  const card = suiviCard(staff, status);
  const steps = suiviTimeline({
    staff,
    items,
    status,
    pendingToolUseId,
    proposalStatuses,
    timeZone,
  });
  const reads = staffReads(items);
  const participants = suiviParticipants(staff, items);
  return (
    <div className="flex flex-col">
      <section aria-labelledby="suivi-status" className={panelSection}>
        <h2 id="suivi-status" className={panelHeading}>
          Suivi
        </h2>
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1.5 size-1.5 shrink-0 rounded-full",
              dotTone[card.tone],
              status === "working" && "motion-safe:animate-pulse",
            )}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{card.title}</span>
            <span className="text-label text-muted-foreground">
              {card.detail}
            </span>
          </span>
        </div>
      </section>
      <section aria-labelledby="suivi-staff" className={panelSection}>
        <h2 id="suivi-staff" className={panelHeading}>
          Participants
        </h2>
        <ul className="flex flex-col">
          {staffAgents.map((agent) => {
            const participant = participants.find(
              (item) => item.agent === agent,
            );
            return (
              <li
                key={agent}
                className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-1.5 last:border-b-0"
              >
                <StaffAvatar
                  agent={agent}
                  size={30}
                  state={
                    agent === "coach" && status === "working" ? "think" : "idle"
                  }
                  decorative
                />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "font-medium",
                      !participant && "text-secondary-foreground",
                    )}
                  >
                    {staff[agent].name}
                  </span>
                  <span className="text-label text-muted-foreground">
                    {participant ? participant.role : "En veille"}
                  </span>
                </span>
                {participant && (
                  <span className="text-label text-muted-foreground">
                    {messagesLabel(participant.messages)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {steps.length > 0 && (
        <section aria-labelledby="suivi-steps" className={panelSection}>
          <h2 id="suivi-steps" className={panelHeading}>
            Déroulé
          </h2>
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li
                key={step.key}
                aria-current={step.state === "current" ? "step" : undefined}
                className="relative grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-2.5 py-1.5"
              >
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-5.5 -bottom-2 left-1.5 w-px bg-border"
                  />
                )}
                {step.state === "current" ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-1 mt-0.5 size-3.5 rounded-full border-2 border-background",
                      step.tone === "accent"
                        ? "bg-primary motion-safe:animate-pulse"
                        : step.tone === "warning"
                          ? "bg-warning"
                          : "bg-secondary-foreground",
                    )}
                  />
                ) : step.state === "upcoming" ? (
                  <span
                    aria-hidden="true"
                    className="relative z-1 mt-0.5 size-3.5 rounded-full border border-dashed border-control-border bg-background"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="relative z-1 mt-0.5 grid size-3.5 place-items-center rounded-full border border-muted-foreground bg-muted"
                  >
                    <CheckIcon
                      className="size-2 text-secondary-foreground"
                      strokeWidth={3}
                    />
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-px">
                  <span
                    className={cn(
                      step.state === "current"
                        ? "font-medium text-foreground"
                        : step.state === "upcoming"
                          ? "text-muted-foreground"
                          : "text-secondary-foreground",
                    )}
                  >
                    {step.label}
                    {step.state === "current" && step.tone !== "neutral" && (
                      <span className="sr-only"> (étape en cours)</span>
                    )}
                    {step.state === "upcoming" && (
                      <span className="sr-only"> (à venir)</span>
                    )}
                  </span>
                  {step.hint && (
                    <span className="text-label text-secondary-foreground">
                      {step.hint}
                    </span>
                  )}
                  {step.detail && (
                    <span className="line-clamp-2 text-label text-muted-foreground">
                      {step.detail}
                    </span>
                  )}
                </span>
                {step.at && (
                  <span className="text-label text-muted-foreground tabular-nums">
                    {step.at}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      <section aria-labelledby="suivi-reads" className={panelSection}>
        <h2 id="suivi-reads" className={panelHeading}>
          Ce que le staff a lu
        </h2>
        {reads.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {reads.map((read) => (
              <Chip key={read}>{read}</Chip>
            ))}
          </div>
        ) : (
          <span className="text-label text-muted-foreground">
            Aucune donnée lue pour l’instant.
          </span>
        )}
        <span className="text-label text-muted-foreground">
          Le staff lit tes données Garmin et ton ressenti. Il propose, tu
          décides. Il ne pose pas de diagnostic.
        </span>
      </section>
    </div>
  );
}
