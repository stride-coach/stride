"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fuelingTolerances,
  toleranceLabels,
  type FuelingTest,
  type FuelingTolerance,
  type LongRun,
} from "@/features/fueling/tests";
import {
  addFuelingTest,
  deleteFuelingTest,
} from "@/server/fueling/test-actions";
import { formatDuration, formatKm, parseHoursMinutes } from "../format";
import { actionMessage } from "../messages";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const other = "other";

function formatDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

function runLabel(run: LongRun) {
  const distance = run.distanceM ? ` · ${formatKm(run.distanceM)} km` : "";
  return `${formatDay(run.day)} · ${formatDuration(run.durationSeconds)}${distance}`;
}

export function FuelingTestsCard({
  tests,
  longRuns,
  message,
  today,
}: {
  tests: FuelingTest[];
  longRuns: LongRun[];
  message: string;
  today: string;
}) {
  return (
    <Widget
      headingLevel={2}
      title={<span id="fueling-tests">Testé à l’entraînement</span>}
      aria-labelledby="fueling-tests"
    >
      <p className="text-body text-secondary-foreground">{message}</p>
      {tests.length > 0 && (
        <ul aria-label="Tests de ravitaillement" className="flex flex-col">
          {tests.map((test) => (
            <TestRow key={test.id} test={test} />
          ))}
        </ul>
      )}
      <TestForm longRuns={longRuns} today={today} />
    </Widget>
  );
}

function TestRow({ test }: { test: FuelingTest }) {
  const [pending, startTransition] = useTransition();
  const summary = `${test.carbsPerHourG} g/h pendant ${formatDuration(test.durationSeconds)}`;
  return (
    <li className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{summary}</span>
        <span className="text-label text-secondary-foreground">
          {formatDay(test.testedOn)} · {toleranceLabels[test.tolerance]}
          {test.note ? ` · ${test.note}` : ""}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        aria-label={`Supprimer le test ${summary} du ${formatDay(test.testedOn)}`}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteFuelingTest(test.id);
            if (result.status === "deleted") toast.success("Test supprimé.");
            else toast.error(actionMessage(result.status));
          })
        }
      >
        Supprimer
      </Button>
    </li>
  );
}

function TestForm({ longRuns, today }: { longRuns: LongRun[]; today: string }) {
  const [run, setRun] = useState(longRuns[0]?.id ?? other);
  const [day, setDay] = useState(today);
  const [duration, setDuration] = useState("");
  const [carbs, setCarbs] = useState("");
  const [tolerance, setTolerance] = useState<FuelingTolerance>("good");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = longRuns.find((item) => item.id === run) ?? null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const carbsPerHourG = Number(carbs);
    if (
      !Number.isInteger(carbsPerHourG) ||
      carbsPerHourG < 10 ||
      carbsPerHourG > 150
    ) {
      setError("Indique un apport entre 10 et 150 g/h.");
      return;
    }
    const durationSeconds = selected
      ? selected.durationSeconds
      : parseHoursMinutes(duration);
    if (durationSeconds === null || durationSeconds < 1800) {
      setError("Indique une durée d’au moins 30 min, par exemple 2h20.");
      return;
    }
    if (!selected && (!day || day > today)) {
      setError("Choisis une date passée.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addFuelingTest({
        testedOn: selected ? selected.day : day,
        activityId: selected ? selected.id : null,
        carbsPerHourG,
        durationSeconds: Math.min(durationSeconds, 172_800),
        tolerance,
        note: note.trim() || null,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      toast.success("Test enregistré.");
      setCarbs("");
      setNote("");
      setDuration("");
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-labelledby="fueling-test-add"
      className="flex flex-col gap-3 rounded-xl border border-dashed border-control-border px-4 py-3.5"
    >
      <h3 id="fueling-test-add" className="font-medium">
        Ajouter un test
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-col gap-1.5">
          <span className="text-body text-secondary-foreground">Sortie</span>
          <Select value={run} onValueChange={setRun}>
            <SelectTrigger aria-label="Sortie" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {longRuns.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {runLabel(item)}
                </SelectItem>
              ))}
              <SelectItem value={other}>Autre sortie</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {!selected && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-body text-secondary-foreground">Date</span>
              <Input
                type="date"
                value={day}
                max={today}
                onChange={(event) => setDay(event.target.value)}
                className="h-control-auto w-40 bg-card px-3"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body text-secondary-foreground">Durée</span>
              <Input
                value={duration}
                placeholder="2h20"
                onChange={(event) => setDuration(event.target.value)}
                className="h-control-auto w-24 bg-card px-3"
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-body text-secondary-foreground">
            Glucides (g/h)
          </span>
          <Input
            inputMode="numeric"
            value={carbs}
            placeholder="60"
            onChange={(event) => setCarbs(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-control-auto w-24 bg-card px-3"
          />
        </label>
      </div>
      <div
        role="group"
        aria-label="Tolérance"
        className="flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-card p-0.5"
      >
        {fuelingTolerances.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tolerance === item}
            onClick={() => setTolerance(item)}
            className="inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
          >
            {toleranceLabels[item]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-body text-secondary-foreground">
            Note (facultatif)
          </span>
          <Input
            value={note}
            maxLength={200}
            placeholder="Gels toutes les 30 min, ventre calme"
            onChange={(event) => setNote(event.target.value)}
            className="h-control-auto bg-card px-3"
          />
        </label>
        <Button type="submit" disabled={pending}>
          Enregistrer le test
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
