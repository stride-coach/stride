"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import {
  maskFrenchDate,
  formatFrenchDate,
  formatLongFrenchDate,
  parseFrenchDate,
} from "@/features/onboarding/dates";
import type { RacePriority, RaceValues } from "@/features/onboarding/goals";
import { coachRequestHref } from "@/features/coach/request";
import {
  DataActivityLink as Link,
  useDataActivityNavigation,
} from "@/features/data-activity/components/navigation";
import { parseClock, parseHoursMinutes } from "../format";
import {
  daysUntil,
  formatKm,
  formatRaceLongDate,
  formatTarget,
} from "../goal-format";
import { RemoveRaceButton } from "./remove-race-button";
import { submitRace } from "@/server/races/goals";

export type RaceFormRace = {
  id: string;
  revision: number;
  values: RaceValues;
  startTime: string | null;
  cutoffSeconds: number | null;
};

const steps = ["La course", "Ton objectif", "Effet sur le plan"] as const;
const headings = [
  "Quelle course ?",
  "Qu’en attends-tu ?",
  "Effet sur le plan",
] as const;
const priorities: {
  value: RacePriority;
  title: string;
  description: string;
}[] = [
  {
    value: "A",
    title: "Objectif principal",
    description: "Structure tout le plan.",
  },
  {
    value: "B",
    title: "Course importante",
    description:
      "Préparée, avec 2 à 3 jours plus légers avant et une récupération après.",
  },
  {
    value: "C",
    title: "Course de préparation",
    description: "Intégrée comme une séance. Pas d’affûtage.",
  },
];

const fieldLabel =
  "flex items-center justify-between gap-2 text-body text-secondary-foreground";
const fieldInput = "h-control-auto bg-card px-3";
const segment =
  "min-h-control-touch flex-1 rounded-md px-2.5 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-6";

function Field({
  label,
  htmlFor,
  className,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className={fieldLabel}>
        <span>{label}</span>
      </label>
      {children}
      {(error || hint) && (
        <span
          className={cn(
            "text-label",
            error ? "text-warning" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <>
      <p className="text-label text-muted-foreground tabular-nums md:hidden">
        Étape {step} sur {steps.length}
      </p>
      <ol
        aria-label="Étapes"
        className="flex items-center gap-3 max-md:sr-only"
      >
        {steps.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  current
                    ? "font-medium text-foreground"
                    : "text-secondary-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-3.5 shrink-0 place-items-center rounded-full border",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && "border-warning bg-warning/20",
                    !done && !current && "border-muted-foreground",
                  )}
                >
                  {done && <CheckIcon className="size-2.5" strokeWidth={3} />}
                </span>
                {label}
                {done && <span className="sr-only"> · terminée</span>}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="h-px w-6 bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

export function RaceForm({
  mode,
  race,
  template,
  defaultPriority,
  primaryName,
  hasPlan,
  today,
  cancelHref,
}: {
  mode: "create" | "edit";
  race?: RaceFormRace;
  template?: Omit<RaceFormRace, "id" | "revision"> & { note: string };
  defaultPriority: RacePriority;
  primaryName: string | null;
  hasPlan: boolean;
  today: string;
  cancelHref: string;
}) {
  const navigate = useDataActivityNavigation();
  const close = () => navigate(cancelHref);
  const initial = race ?? template;
  const values = initial?.values;
  const [step, setStep] = useState(1);
  const [saving, startSaving] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [name, setName] = useState(values?.name ?? "");
  const [dateText, setDateText] = useState(
    formatFrenchDate(values?.race_date ?? null),
  );
  const [start, setStart] = useState(initial?.startTime ?? "");
  const [distance, setDistance] = useState(
    values?.distance_km === null || values?.distance_km === undefined
      ? ""
      : String(values.distance_km).replace(".", ","),
  );
  const [elevation, setElevation] = useState(
    values?.elevation_gain_m === null || values?.elevation_gain_m === undefined
      ? ""
      : String(values.elevation_gain_m),
  );
  const [cutoff, setCutoff] = useState(
    initial?.cutoffSeconds ? formatTarget(initial.cutoffSeconds) : "",
  );
  const [kind, setKind] = useState(values?.race_kind ?? "trail");
  const [priority, setPriority] = useState<RacePriority>(
    values?.priority ?? defaultPriority,
  );
  const [target, setTarget] = useState(
    values?.target_duration_seconds
      ? formatTarget(values.target_duration_seconds)
      : "",
  );

  const isoDate = parseFrenchDate(dateText);
  const distanceKm = Number(distance.replace(/\s/g, "").replace(",", "."));
  const elevationM = elevation.trim() === "" ? null : Number(elevation);
  const startMinutes = start.trim() === "" ? null : parseClock(start);
  const cutoffSeconds = cutoff.trim() === "" ? null : parseHoursMinutes(cutoff);
  const targetSeconds = target.trim() === "" ? null : parseHoursMinutes(target);
  const errors = {
    name: name.trim() ? null : "Donne un nom à la course.",
    date: isoDate ? null : "Date attendue au format JJ/MM/AAAA.",
    start:
      start.trim() === "" || startMinutes !== null
        ? null
        : "Utilise le format 05:30.",
    distance:
      distance.trim() !== "" && distanceKm > 0 && distanceKm <= 1000
        ? null
        : "Indique une distance en kilomètres.",
    elevation:
      elevationM === null ||
      (Number.isInteger(elevationM) && elevationM >= 0 && elevationM <= 30000)
        ? null
        : "Indique un dénivelé en mètres.",
    cutoff:
      cutoff.trim() === "" || cutoffSeconds !== null
        ? null
        : "Utilise le format 9h00.",
    target:
      target.trim() === "" || targetSeconds !== null
        ? null
        : "Utilise le format 18h30.",
  };
  const stepOneValid = !(
    errors.name ||
    errors.date ||
    errors.start ||
    errors.distance ||
    errors.elevation ||
    errors.cutoff
  );
  const show = (error: string | null) => (attempted ? error : null);

  function save() {
    const data = new FormData();
    if (race) {
      data.set("id", race.id);
      data.set("revision", String(race.revision));
    }
    data.set("race_kind", kind);
    data.set("name", name);
    data.set("race_date", isoDate ?? "");
    data.set("distance_km", String(distanceKm));
    data.set("elevation_gain_m", elevation);
    data.set("priority", priority);
    data.set(
      "target_duration",
      targetSeconds ? formatTarget(targetSeconds) : "",
    );
    data.set(
      "start_time",
      startMinutes === null
        ? ""
        : `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
    );
    data.set(
      "cutoff_duration",
      cutoffSeconds ? formatTarget(cutoffSeconds) : "",
    );
    startSaving(async () => {
      const result = await submitRace(data);
      if (result.status === "saved") {
        setSavedId(result.id);
        setStep(3);
        return;
      }
      toast.error(
        result.status === "conflict"
          ? "Cette course a changé entre-temps. Rouvre-la et réessaie."
          : result.status === "session-expired"
            ? "Ta session a expiré. Connecte-toi à nouveau."
            : result.status === "invalid"
              ? "Vérifie les valeurs saisies et réessaie."
              : "Impossible d’enregistrer la course. Réessaie.",
      );
    });
  }

  function next() {
    if (step === 1 && !stepOneValid) {
      setAttempted(true);
      return;
    }
    if (step === 2) {
      if (errors.target) {
        setAttempted(true);
        return;
      }
      save();
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  const warning =
    priority === "A" && primaryName
      ? `Tu as déjà une course A : ${primaryName}. L’objectif principal reste la plus proche.`
      : null;
  const raceName = name.trim() || "cette course";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 3) next();
      }}
      className="mx-auto flex w-full max-w-180 flex-col gap-6 py-2 md:py-6"
    >
      <Stepper step={step} />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-verdict font-semibold">{headings[step - 1]}</h1>
        <p className="text-body-lg text-pretty text-secondary-foreground">
          {step === 1 &&
            (template ? template.note : "Tout reste modifiable après l’ajout.")}
          {step === 2 &&
            "La priorité décide de la place que la course prend dans ton plan."}
          {step === 3 &&
            (mode === "edit"
              ? "Course mise à jour."
              : "Course ajoutée à tes objectifs.")}
        </p>
      </div>

      {step === 1 && (
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-3.5 pb-5 md:grid-cols-[minmax(0,1fr)_8.125rem_5.625rem]">
            <Field
              label="Nom"
              htmlFor="race-name"
              className="col-span-2 md:col-span-1"
              error={show(errors.name)}
            >
              <Input
                id="race-name"
                value={name}
                maxLength={120}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
                className={fieldInput}
              />
            </Field>
            <Field
              label="Date"
              htmlFor="race-date"
              error={show(errors.date)}
              hint={isoDate ? formatLongFrenchDate(isoDate) : "JJ/MM/AAAA"}
            >
              <Input
                id="race-date"
                inputMode="numeric"
                placeholder="JJ/MM/AAAA"
                value={dateText}
                onChange={(event) =>
                  setDateText(maskFrenchDate(event.target.value))
                }
                className={fieldInput}
              />
            </Field>
            <Field
              label="Départ"
              htmlFor="race-start"
              error={show(errors.start)}
              hint="Facultatif"
            >
              <Input
                id="race-start"
                inputMode="numeric"
                placeholder="06:30"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className={fieldInput}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3.5 pb-5 md:grid-cols-[6rem_6rem_8.125rem]">
            <Field
              label="Distance"
              htmlFor="race-distance"
              error={show(errors.distance)}
            >
              <span className="relative block">
                <Input
                  id="race-distance"
                  inputMode="decimal"
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                  className={cn(fieldInput, "pr-10")}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-body text-muted-foreground"
                >
                  km
                </span>
              </span>
            </Field>
            <Field
              label="Dénivelé"
              htmlFor="race-elevation"
              error={show(errors.elevation)}
            >
              <span className="relative block">
                <Input
                  id="race-elevation"
                  inputMode="numeric"
                  value={elevation}
                  onChange={(event) => setElevation(event.target.value)}
                  className={cn(fieldInput, "pr-8")}
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-body text-muted-foreground"
                >
                  m
                </span>
              </span>
            </Field>
            <Field
              label="Barrière horaire"
              htmlFor="race-cutoff"
              error={show(errors.cutoff)}
              hint="Facultatif"
            >
              <Input
                id="race-cutoff"
                placeholder="9h00"
                value={cutoff}
                onChange={(event) => setCutoff(event.target.value)}
                className={fieldInput}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border py-4">
            <span id="race-kind" className="font-medium">
              Type
            </span>
            <div
              role="group"
              aria-labelledby="race-kind"
              className="flex gap-0.5 rounded-md border border-border bg-card p-0.5"
            >
              {(["road", "trail"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={kind === option}
                  onClick={() => setKind(option)}
                  className={segment}
                >
                  {option === "road" ? "Route" : "Trail"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Priorité</legend>
            {priorities.map((option) => {
              const description =
                option.value === "A" && primaryName
                  ? `Structure tout le plan. Tu en as déjà une : ${primaryName}.`
                  : option.description;
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition-colors duration-150 ease-stride hover:border-control-border has-checked:border-primary has-checked:bg-accent has-focus-visible:outline-2 has-focus-visible:outline-ring"
                >
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={priority === option.value}
                    onChange={() => setPriority(option.value)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="grid size-4 shrink-0 place-items-center rounded-full border border-control-border peer-checked:border-primary peer-checked:[&>span]:block"
                  >
                    <span className="hidden size-2 rounded-full bg-primary" />
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium">
                      {option.value} · {option.title}
                    </span>
                    <span className="text-label text-secondary-foreground">
                      {description}
                    </span>
                  </span>
                </label>
              );
            })}
            {warning && (
              <p className="text-label text-secondary-foreground">{warning}</p>
            )}
          </fieldset>
          <div className="border-t border-border pt-5">
            <Field
              label="Temps visé · facultatif"
              htmlFor="race-target"
              className="max-w-sm"
              error={show(errors.target)}
              hint="Format 18h30. Tu pourras l’ajuster depuis le plan de course."
            >
              <Input
                id="race-target"
                placeholder="18h30"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className={fieldInput}
              />
            </Field>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5">
            <StrideMark className="mt-0.5 size-3.5 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">
                {hasPlan
                  ? "Ton plan n’a pas changé."
                  : "Aucun plan n’est défini pour l’instant."}
              </p>
              <p className="text-secondary-foreground">
                {hasPlan
                  ? "Le coach peut l’adapter à cette course. Il te proposera les ajustements à relire avant de les appliquer."
                  : "Cette course est enregistrée sans modifier aucune semaine. Quand tu auras un plan, Stride s’appuiera sur elle pour le construire et te proposera les ajustements à relire avant de les appliquer."}
              </p>
              {hasPlan && savedId && (
                <Link
                  href={coachRequestHref(
                    `Adapte mon plan à ${raceName}.`,
                    null,
                    savedId,
                  )}
                  className="self-start font-medium text-primary hover:text-foreground"
                >
                  Demander au coach
                </Link>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3.5 md:grid-cols-4">
            {[
              {
                label: name || "Course",
                value: `Course ${priority}`,
              },
              {
                label: formatRaceLongDate(isoDate ?? null),
                value: isoDate ? `${daysUntil(isoDate, today)} jours` : "—",
              },
              {
                label: "Distance",
                value: formatKm(
                  Number.isFinite(distanceKm) ? distanceKm : null,
                ),
              },
              {
                label: "Temps visé",
                value: targetSeconds ? formatTarget(targetSeconds) : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-col-reverse gap-0.5"
              >
                <dt className="truncate text-label text-secondary-foreground">
                  {item.label}
                </dt>
                <dd
                  data-slot="metric"
                  className="text-title font-semibold tabular-nums"
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <footer
        className={cn(
          "flex flex-wrap items-center gap-2.5",
          step < 3 && "border-t border-border pt-4",
        )}
      >
        {step === 1 && (
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            className="text-secondary-foreground"
          >
            Annuler
          </Button>
        )}
        {step === 2 && (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => setStep(1)}
            className="text-secondary-foreground"
          >
            Retour
          </Button>
        )}
        {mode === "edit" && race && step === 1 && (
          <RemoveRaceButton
            id={race.id}
            name={race.values.name ?? "cette course"}
          />
        )}
        <span className="ml-auto" />
        {step < 3 ? (
          <Button type="submit" disabled={saving}>
            {step === 2 ? "Voir l’effet sur le plan" : "Continuer"}
          </Button>
        ) : (
          <>
            <Button
              asChild
              variant="ghost"
              className="text-secondary-foreground"
            >
              <Link href="/races">Retour aux courses</Link>
            </Button>
            <Button asChild>
              <Link href={`/races/${savedId ?? race?.id ?? ""}`}>
                Voir la course
              </Link>
            </Button>
          </>
        )}
      </footer>
    </form>
  );
}
