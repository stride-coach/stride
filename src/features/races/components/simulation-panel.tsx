"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { changeRaceSetting } from "@/server/races/actions";
import type { SettingChange } from "../settings-history";
import { actionMessage } from "../messages";
import type { RaceKind } from "@/features/onboarding/goals";
import {
  settingValue,
  stepSetting,
  type SimulationSetting,
  type SimulationSummary,
} from "../simulation-settings";

type Values = Record<SimulationSetting, number>;

const names: Record<SimulationSetting, { label: string; noun: string }> = {
  target: { label: "Objectif", noun: "l’objectif" },
  walkGrade: { label: "Marcher dès", noun: "le seuil de marche" },
  aidStop: { label: "Arrêt par ravito", noun: "l’arrêt par ravito" },
};

const undoMilliseconds = 10_000;

function Stepper({
  setting,
  value,
  detail,
  pending,
  onStep,
}: {
  setting: SimulationSetting;
  value: number;
  detail: string;
  pending: boolean;
  onStep: (direction: 1 | -1) => void;
}) {
  const { label, noun } = names[setting];
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span id={`simulation-${setting}`}>{label}</span>
        <span className="text-label text-muted-foreground">{detail}</span>
      </div>
      <div
        role="group"
        aria-labelledby={`simulation-${setting}`}
        aria-busy={pending || undefined}
        className="flex items-center rounded-md border border-border bg-background"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Réduire ${noun}`}
          disabled={pending}
          onClick={() => onStep(-1)}
        >
          <MinusIcon aria-hidden="true" />
        </Button>
        <output
          aria-live="polite"
          className="min-w-14 text-center font-semibold tabular-nums"
        >
          {settingValue(setting, value)}
        </output>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Augmenter ${noun}`}
          disabled={pending}
          onClick={() => onStep(1)}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function Result({
  label,
  fact,
  tone,
}: {
  label: string;
  fact: { value: string; detail: string | null } | null;
  tone?: "warning";
}) {
  if (!fact) return null;
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3">
      <dt className="text-secondary-foreground">{label}</dt>
      <dd className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span
          className={cn(
            "font-semibold tabular-nums",
            tone === "warning" && "text-warning",
          )}
        >
          {fact.value}
        </span>
        {fact.detail && (
          <span className="text-label text-muted-foreground">
            {fact.detail}
          </span>
        )}
      </dd>
    </div>
  );
}

export function SimulationPanel({
  raceId,
  raceRevision,
  planRevision,
  kind,
  values,
  summary,
  weatherNote,
  history = [],
}: {
  raceId: string;
  raceRevision: number;
  planRevision: number | null;
  kind: RaceKind;
  values: Values;
  summary: SimulationSummary;
  weatherNote: string | null;
  history?: SettingChange[];
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(
    values,
    (current, [setting, value]: [SimulationSetting, number]) => ({
      ...current,
      [setting]: value,
    }),
  );
  const revisions = useRef({ race: raceRevision, plan: planRevision });
  useEffect(() => {
    revisions.current = { race: raceRevision, plan: planRevision };
  }, [raceRevision, planRevision]);

  function persist(
    setting: SimulationSetting,
    value: number,
    previous: number,
  ) {
    const { race, plan } = revisions.current;
    return changeRaceSetting({
      raceId,
      setting,
      value,
      previous,
      raceRevision: race,
      planRevision: plan,
      kind,
    });
  }

  function change(
    setting: SimulationSetting,
    value: number,
    previous: number,
    undo = false,
  ) {
    startTransition(async () => {
      setShown([setting, value]);
      const result = await persist(setting, value, previous);
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      if (undo || previous === value) return;
      toast.success(
        `${names[setting].label} : ${settingValue(setting, value)}`,
        {
          id: `simulation-${setting}`,
          duration: undoMilliseconds,
          action: {
            label: "Annuler",
            onClick: () => change(setting, previous, value, true),
          },
        },
      );
    });
  }

  function step(setting: SimulationSetting, direction: 1 | -1) {
    const current = shown[setting];
    const next = stepSetting(setting, current, direction);
    if (next !== current) change(setting, next, values[setting]);
  }

  return (
    <section
      aria-labelledby="simulation-title"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <h2
        id="simulation-title"
        className="text-label font-medium text-muted-foreground"
      >
        Régler la simulation
      </h2>
      <div className="flex flex-col">
        <Stepper
          setting="target"
          value={shown.target}
          detail="temps à l’arrivée"
          pending={pending}
          onStep={(direction) => step("target", direction)}
        />
        <Stepper
          setting="walkGrade"
          value={shown.walkGrade}
          detail="pente d’une côte"
          pending={pending}
          onStep={(direction) => step("walkGrade", direction)}
        />
        <Stepper
          setting="aidStop"
          value={shown.aidStop}
          detail={`${summary.stops.count} arrêt${summary.stops.count > 1 ? "s" : ""} · ${summary.stops.total} au total`}
          pending={pending}
          onStep={(direction) => step("aidStop", direction)}
        />
      </div>
      <dl
        aria-busy={pending || undefined}
        className={cn(
          "flex flex-col gap-2 border-t border-border pt-3 transition-opacity duration-150 ease-stride",
          pending && "opacity-60",
        )}
      >
        <Result label="Arrivée" fact={summary.finish} />
        <Result label="En marchant" fact={summary.walk} />
        <Result label="De nuit" fact={summary.night} />
        <Result
          label="Marge"
          fact={summary.margin}
          tone={summary.margin?.tight ? "warning" : undefined}
        />
      </dl>
      <p className="text-label text-pretty text-muted-foreground">
        Chaque réglage recalcule les heures de passage, la météo rencontrée et
        le ravitaillement. Tu peux annuler pendant 10 secondes.
        {weatherNote && ` ${weatherNote}`}
      </p>
      {history.length > 0 && (
        <details className="border-t border-border pt-3">
          <summary className="inline-flex min-h-control-touch cursor-pointer items-center text-label text-primary hover:text-foreground md:min-h-0">
            Historique des réglages
          </summary>
          <ul className="flex flex-col pt-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 border-t border-border py-2 first:border-t-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label text-muted-foreground tabular-nums">
                    {item.when}
                  </span>
                  <span className="tabular-nums">
                    {item.label}
                    {item.from ? ` ${item.from} → ` : " → "}
                    <span className="font-medium">{item.to}</span>
                  </span>
                </span>
                {item.restore !== null &&
                  item.restore !== shown[item.setting] && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        change(item.setting, item.restore!, shown[item.setting])
                      }
                      aria-label={`Rétablir ${item.label.toLowerCase()} à ${item.from}`}
                    >
                      Rétablir
                    </Button>
                  )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
