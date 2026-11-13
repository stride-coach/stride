"use client";

import { useState, useTransition } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRaceScenario,
  deleteRaceScenario,
  setRacePlanB,
} from "@/server/races/scenarios";
import { formatClock, formatHours } from "../format";
import { actionMessage } from "../messages";
import { useRevisions } from "./scenario-actions";

export type ScenarioSource = {
  key: string;
  label: string;
  seconds: number;
  walkGradePercent: number;
  aidStopSeconds: number;
  carbsPerHourG: number;
};

function Stepper({
  id,
  label,
  value,
  display,
  onChange,
  step,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-secondary-foreground">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={id}
        className="flex items-center gap-2"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Diminuer ${label.toLowerCase()}`}
          disabled={value - step < min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <MinusIcon />
        </Button>
        <output className="w-16 text-center font-semibold tabular-nums">
          {display}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Augmenter ${label.toLowerCase()}`}
          disabled={value + step > max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

export function CreateCustomScenario({
  raceId,
  sources,
  startMinutes,
  disabled,
}: {
  raceId: string;
  sources: ScenarioSource[];
  startMinutes: number;
  disabled: boolean;
}) {
  const initial =
    sources.find((source) => source.key === "target") ?? sources[0];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [from, setFrom] = useState(initial?.key ?? "");
  const [seconds, setSeconds] = useState(initial?.seconds ?? 3600);
  const [walk, setWalk] = useState(initial?.walkGradePercent ?? 10);
  const [stop, setStop] = useState(initial?.aidStopSeconds ?? 300);
  const [carbs, setCarbs] = useState(initial?.carbsPerHourG ?? 60);
  const [pending, startTransition] = useTransition();
  if (!initial) return null;
  const pick = (key: string) => {
    const source = sources.find((item) => item.key === key);
    if (!source) return;
    setFrom(key);
    setSeconds(source.seconds);
    setWalk(source.walkGradePercent);
    setStop(source.aidStopSeconds);
    setCarbs(source.carbsPerHourG);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createRaceScenario({
        raceId,
        name,
        targetSeconds: seconds,
        walkGradePercent: walk,
        aidStopSeconds: stop,
        carbsPerHourG: carbs,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      toast.success(`Scénario « ${name.trim()} » ajouté.`);
      setOpen(false);
      setName("");
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="self-start"
        >
          <PlusIcon />
          Créer un scénario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Créer un scénario</DialogTitle>
            <DialogDescription>
              Pars d’un scénario existant et change ce qui compte pour toi.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scenario-name">Nom du scénario</Label>
            <Input
              id="scenario-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              required
              placeholder="Entre les deux"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="scenario-from" className="text-body font-medium">
              Partir de
            </span>
            <div
              role="group"
              aria-labelledby="scenario-from"
              className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-card p-0.5"
            >
              {sources.map((source) => (
                <button
                  key={source.key}
                  type="button"
                  aria-pressed={from === source.key}
                  onClick={() => pick(source.key)}
                  className="inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-border pt-3">
            <Stepper
              id="scenario-target"
              label="Objectif"
              value={seconds}
              display={formatHours(seconds)}
              onChange={setSeconds}
              step={300}
              min={600}
              max={1_209_599}
            />
            <Stepper
              id="scenario-walk"
              label="Marcher dès"
              value={walk}
              display={`${walk} %`}
              onChange={setWalk}
              step={1}
              min={5}
              max={20}
            />
            <Stepper
              id="scenario-stop"
              label="Arrêt par ravito"
              value={stop}
              display={`${Math.round(stop / 60)} min`}
              onChange={setStop}
              step={60}
              min={0}
              max={3600}
            />
            <Stepper
              id="scenario-carbs"
              label="Glucides"
              value={carbs}
              display={`${carbs} g/h`}
              onChange={setCarbs}
              step={5}
              min={20}
              max={120}
            />
          </div>
          <div
            role="status"
            className="flex items-baseline gap-2 rounded-lg border border-border px-3 py-2.5"
          >
            <span className="text-verdict font-semibold tabular-nums">
              {formatHours(seconds)}
            </span>
            <span className="text-secondary-foreground">
              Arrivée vers {formatClock(startMinutes + seconds / 60)}
            </span>
          </div>
          <p className="text-label text-pretty text-muted-foreground">
            Un scénario ne remplace pas ton plan. Tu le compares aux autres,
            puis tu choisis.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !name.trim()}>
              Ajouter aux scénarios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCustomScenario({
  raceId,
  scenarioId,
  name,
}: {
  raceId: string;
  scenarioId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await deleteRaceScenario({ raceId, scenarioId });
          if (result.status !== "saved")
            toast.error(actionMessage(result.status));
          else toast.success(`Scénario « ${name} » supprimé.`);
        })
      }
    >
      Supprimer
    </Button>
  );
}

export function PlanBToggle({
  raceId,
  scenarioKey,
  active,
  label,
  children,
}: {
  raceId: string;
  scenarioKey: string;
  active: boolean;
  label: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const revisions = useRevisions();
  return (
    <Button
      type="button"
      variant={children ? "outline" : "ghost"}
      className={children ? "self-start" : undefined}
      disabled={pending}
      aria-pressed={active}
      onClick={() =>
        startTransition(async () => {
          const result = await setRacePlanB({
            raceId,
            revision: revisions.current.plan,
            planB: active ? null : scenarioKey,
          });
          if (result.status !== "saved")
            toast.error(actionMessage(result.status));
          else
            toast.success(
              active ? "Plus de plan B." : `« ${label} » gardé en plan B.`,
            );
        })
      }
    >
      {children ?? (active ? "Retirer le plan B" : "Garder en plan B")}
    </Button>
  );
}
