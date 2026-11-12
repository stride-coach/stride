"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RaceKind } from "@/features/onboarding/goals";
import { saveRacePlan, saveRaceTarget } from "@/server/races/actions";
import { formatHours, parseHoursMinutes } from "../format";
import { actionMessage } from "../messages";
import type { ScenarioKey } from "../workspace";

type Alternative = Exclude<ScenarioKey, "target">;

const fields: Record<Alternative, "ambitiousSeconds" | "cautiousSeconds"> = {
  ambitious: "ambitiousSeconds",
  cautious: "cautiousSeconds",
};

const names: Record<Alternative, string> = {
  ambitious: "ambitieux",
  cautious: "prudent",
};

type Revisions = { race: number; plan: number | null };

const RevisionContext = createContext<React.RefObject<Revisions> | null>(null);

export function ScenarioRevisions({
  race,
  plan,
  children,
}: Revisions & { children: React.ReactNode }) {
  const ref = useRef<Revisions>({ race, plan });
  useEffect(() => {
    ref.current = { race, plan };
  }, [race, plan]);
  return (
    <RevisionContext.Provider value={ref}>{children}</RevisionContext.Provider>
  );
}

export function useRevisions() {
  const ref = useContext(RevisionContext);
  if (!ref) throw new Error("ScenarioRevisions is missing");
  return ref;
}

export function ChooseScenario({
  raceId,
  kind,
  scenario,
  seconds,
  targetSeconds,
}: {
  raceId: string;
  kind: RaceKind;
  scenario: Alternative;
  seconds: number;
  targetSeconds: number;
}) {
  const [pending, startTransition] = useTransition();
  const revisions = useRevisions();

  function swap(target: number, alternative: number | null, undo: boolean) {
    startTransition(async () => {
      const first = await saveRaceTarget(
        raceId,
        revisions.current.race,
        target,
        kind,
      );
      const second =
        first.status === "saved"
          ? await saveRacePlan(raceId, revisions.current.plan, {
              [fields[scenario]]: alternative,
            })
          : first;
      if (second.status !== "saved") {
        toast.error(actionMessage(second.status));
        return;
      }
      if (undo) return;
      toast.success(`Nouvel objectif : ${formatHours(target)}`, {
        id: "scenario-choice",
        duration: 10_000,
        action: {
          label: "Annuler",
          onClick: () => swap(targetSeconds, seconds, true),
        },
      });
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => swap(seconds, null, false)}
    >
      En faire mon objectif
    </Button>
  );
}

export function CreateScenario({
  raceId,
  missing,
  targetSeconds,
}: {
  raceId: string;
  missing: Alternative[];
  targetSeconds: number;
}) {
  const [scenario, setScenario] = useState<Alternative>(missing[0]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const revisions = useRevisions();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seconds = parseHoursMinutes(value.trim());
    if (seconds === null) {
      setError("Utilise le format 19h15.");
      return;
    }
    if (scenario === "cautious" && seconds <= targetSeconds) {
      setError(
        `Un scénario prudent est plus lent que ${formatHours(targetSeconds)}.`,
      );
      return;
    }
    if (scenario === "ambitious" && seconds >= targetSeconds) {
      setError(
        `Un scénario ambitieux est plus rapide que ${formatHours(targetSeconds)}.`,
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveRacePlan(raceId, revisions.current.plan, {
        [fields[scenario]]: seconds,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      toast.success(`Scénario ${names[scenario]} ajouté.`);
      setValue("");
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby="scenario-create"
      className="flex flex-col gap-3 rounded-xl border border-dashed border-control-border px-4 py-3.5"
    >
      <h3 id="scenario-create" className="font-medium">
        Créer un scénario
      </h3>
      {missing.length > 1 && (
        <div
          role="group"
          aria-label="Type de scénario"
          className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5"
        >
          {missing.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={scenario === item}
              onClick={() => setScenario(item)}
              className="inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
            >
              {item === "cautious" ? "Prudent" : "Ambitieux"}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-body text-secondary-foreground">
            Temps visé · {names[scenario]}
          </span>
          <Input
            value={value}
            placeholder={formatHours(
              scenario === "cautious"
                ? targetSeconds + 45 * 60
                : Math.max(600, targetSeconds - 45 * 60),
            )}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-control-auto w-32 bg-card px-3"
          />
        </label>
        <Button type="submit" disabled={pending}>
          Ajouter
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-label text-warning">
          {error}
        </p>
      )}
    </form>
  );
}
