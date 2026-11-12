"use client";

import { useTransition } from "react";
import { FlagIcon } from "lucide-react";
import { toast } from "sonner";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Widget } from "@/components/stride/widget";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { Button } from "@/components/ui/button";
import type { RaceKind } from "@/features/onboarding/goals";
import { changeRaceSetting } from "@/server/races/actions";
import {
  threatenedMarginSeconds,
  type CutoffAlert,
  type CutoffRemedy,
  type SettingStep,
} from "../cutoff-alert";
import { actionMessage } from "../messages";
import { useRevisions } from "./scenario-actions";

const undoMilliseconds = 10_000;

export function CutoffAlertCard({
  raceId,
  kind,
  alert,
  coachHref,
}: {
  raceId: string;
  kind: RaceKind;
  alert: CutoffAlert;
  coachHref: string;
}) {
  const [pending, startTransition] = useTransition();
  const revisions = useRevisions();
  const recommended = alert.remedies.find(
    (remedy) => remedy.marginSeconds >= threatenedMarginSeconds,
  );

  async function save(changes: SettingStep[]) {
    for (const change of changes) {
      const result = await changeRaceSetting({
        raceId,
        setting: change.setting,
        value: change.value,
        previous: change.previous,
        raceRevision: revisions.current.race,
        planRevision: revisions.current.plan,
        kind,
      });
      if (result.status !== "saved") return result.status;
    }
    return "saved";
  }

  function apply(remedy: CutoffRemedy) {
    startTransition(async () => {
      const status = await save(remedy.changes);
      if (status !== "saved") {
        toast.error(actionMessage(status));
        return;
      }
      toast.success(`${remedy.title} : ${remedy.margin}`, {
        id: "cutoff-remedy",
        duration: undoMilliseconds,
        action: {
          label: "Annuler",
          onClick: async () => {
            const undone = await save(
              remedy.changes.map((change) => ({
                setting: change.setting,
                value: change.previous,
                previous: change.value,
              })),
            );
            if (undone !== "saved") toast.error(actionMessage(undone));
          },
        },
      });
    });
  }

  return (
    <Widget
      headingLevel={2}
      icon={<FlagIcon />}
      title={<span id="cutoff-alert">{alert.barrier.heading}</span>}
      verdict={
        <Status level={alert.barrier.marginSeconds < 0 ? "alert" : "watch"}>
          {alert.badge}
        </Status>
      }
      aria-labelledby="cutoff-alert"
    >
      <div className="flex flex-col">
        <p className="flex items-start gap-3 border-b border-border pb-3.5 text-pretty">
          <StrideMark className="mt-0.75 shrink-0" />
          <span>{alert.reading}</span>
        </p>
        {alert.remedies.length > 0 && (
          <ul aria-label="Réglages proposés" className="flex flex-col">
            {alert.remedies.map((remedy) => (
              <li
                key={remedy.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border py-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{remedy.title}</span>
                  <span className="text-label text-secondary-foreground">
                    {remedy.detail}
                  </span>
                </div>
                <span className="self-start font-semibold whitespace-nowrap tabular-nums md:self-center">
                  {remedy.margin}
                </span>
                <Button
                  type="button"
                  variant={remedy === recommended ? "default" : "outline"}
                  disabled={pending}
                  aria-label={`Appliquer : ${remedy.title}`}
                  onClick={() => apply(remedy)}
                  className="col-span-2 md:col-span-1"
                >
                  Appliquer
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-3 text-label text-secondary-foreground">
          Rien ne change tant que tu n’as pas choisi. Tu peux aussi{" "}
          <Link
            href={coachHref}
            className="underline underline-offset-2 hover:text-foreground"
          >
            en parler au staff
          </Link>
          .
        </p>
      </div>
    </Widget>
  );
}
