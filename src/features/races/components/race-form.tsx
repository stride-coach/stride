"use client";

import { useRef, useState, useTransition } from "react";
import { CheckIcon, CircleCheckIcon, UploadIcon } from "lucide-react";
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
import {
  maxRaceTestItems,
  type RaceKind,
  type RacePriority,
  type RaceValues,
} from "@/features/onboarding/goals";
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
import { RacePlanEffect } from "./race-plan-effect";
import {
  expectationLabels,
  poleLabels,
  targetEstimate,
  testSuggestions,
  type RaceDetails,
  type ReferenceRace,
} from "../race-details";
import { RemoveRaceButton } from "./remove-race-button";
import { uploadTo } from "./course-import";
import { importMessage } from "../messages";
import {
  formatRaceDateField,
  gpxSummary,
  priorityComment,
  tailoredTests,
  type GpxSummary,
} from "../race-form-help";
import { formatInteger } from "../format";
import { submitRace } from "@/server/races/goals";

export type RaceFormRace = {
  id: string;
  revision: number;
  values: RaceValues;
  startTime: string | null;
  cutoffSeconds: number | null;
  details: RaceDetails;
  course?: { distanceM: number; elevationGainM: number | null } | null;
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

const measured = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function measuredKm(meters: number) {
  return `${measured.format(meters / 1000)} km`;
}

const fieldLabel =
  "flex items-center justify-between gap-2 text-body text-secondary-foreground";
const fieldInput = "h-control-auto bg-card px-3";
const segment =
  "min-h-control-touch flex-1 rounded-md px-2.5 whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-6";

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
  references = [],
  defaultPriority,
  primaryName,
  primary = null,
  hasPlan,
  today,
  cancelHref,
}: {
  mode: "create" | "edit";
  race?: RaceFormRace;
  template?: Omit<RaceFormRace, "id" | "revision"> & { note: string };
  references?: ReferenceRace[];
  defaultPriority: RacePriority;
  primaryName: string | null;
  primary?: { name: string; kind: RaceKind } | null;
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
  const details = initial?.details;
  const [location, setLocation] = useState(details?.location ?? "");
  const [poles, setPoles] = useState<RaceDetails["poles"]>(
    details?.poles ?? null,
  );
  const [expectation, setExpectation] = useState<RaceDetails["expectation"]>(
    details?.expectation ?? null,
  );
  const [testItems, setTestItems] = useState<string[]>(
    details?.testItems ?? [],
  );
  const [customTest, setCustomTest] = useState("");
  const [dateFocused, setDateFocused] = useState(false);
  const [gpx, setGpx] = useState<{ file: File; summary: GpxSummary } | null>(
    null,
  );
  const gpxInput = useRef<HTMLInputElement>(null);

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
    data.set("location", location);
    data.set("poles", kind === "trail" ? (poles ?? "") : "");
    data.set("expectation", expectation ?? "");
    data.set("test_items", JSON.stringify(testItems));
    startSaving(async () => {
      const result = await submitRace(data);
      if (result.status === "saved") {
        if (gpx && mode === "create") {
          const body = new FormData();
          body.set("file", gpx.file);
          const upload = await uploadTo(`/api/races/${result.id}/course`, body);
          if (upload.status !== "saved")
            toast.error(importMessage(upload.status));
        }
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

  const warning = primaryName
    ? `Choisir A en ferait un deuxième objectif principal à côté de ${primaryName} : Stride te montrerait d’abord l’effet sur le plan.`
    : null;
  const raceName = name.trim() || "cette course";
  const estimate = targetEstimate(references, {
    kind,
    distanceKm:
      Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : null,
    elevationGainM: elevationM,
  });
  async function pickGpx(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(importMessage("too-large"));
      return;
    }
    const summary = gpxSummary(await file.text());
    if (!summary) {
      toast.error(importMessage("invalid-file"));
      return;
    }
    setGpx({ file, summary });
    if (!name.trim() && summary.name) setName(summary.name.slice(0, 120));
    if (!distance.trim())
      setDistance(
        String(Math.round(summary.distanceM / 100) / 10).replace(".", ","),
      );
    if (!elevation.trim() && summary.elevationGainM !== null)
      setElevation(String(Math.round(summary.elevationGainM)));
  }

  function addCustomTest() {
    const item = customTest.trim().slice(0, 60);
    if (!item || testItems.length >= maxRaceTestItems) return;
    setTestItems((current) =>
      current.includes(item) ? current : [...current, item],
    );
    setCustomTest("");
  }

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
            (mode === "edit"
              ? "Modifie ce qui a changé : le plan de course suit."
              : template
                ? template.note
                : gpx
                  ? "Préremplie depuis le GPX. Tout reste modifiable."
                  : "Tout reste modifiable après l’ajout.")}
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
          <div className="grid grid-cols-2 gap-3.5 pb-5 md:grid-cols-[minmax(0,1fr)_8.125rem_5.625rem_10.625rem]">
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
            <Field label="Date" htmlFor="race-date" error={show(errors.date)}>
              <Input
                id="race-date"
                inputMode="numeric"
                placeholder="JJ/MM/AAAA"
                value={
                  !dateFocused && isoDate
                    ? formatRaceDateField(isoDate)
                    : dateText
                }
                onFocus={() => setDateFocused(true)}
                onBlur={() => setDateFocused(false)}
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
            >
              <Input
                id="race-start"
                inputMode="numeric"
                placeholder="hh:mm"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className={fieldInput}
              />
            </Field>
            <Field label="Lieu" htmlFor="race-location">
              <Input
                id="race-location"
                value={location}
                maxLength={120}
                placeholder="Ville"
                onChange={(event) => setLocation(event.target.value)}
                className={fieldInput}
              />
            </Field>
            <div className="max-md:contents md:col-span-4 md:flex md:gap-3.5">
              <Field
                label="Distance"
                htmlFor="race-distance"
                className="md:w-24"
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
                className="md:w-24"
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
                className="md:w-32.5"
                error={show(errors.cutoff)}
              >
                <Input
                  id="race-cutoff"
                  placeholder="Aucune"
                  value={cutoff}
                  onChange={(event) => setCutoff(event.target.value)}
                  className={fieldInput}
                />
              </Field>
            </div>
            {mode === "edit" && race?.course && (
              <p className="col-span-2 text-label text-pretty text-muted-foreground md:col-span-4">
                Le plan de course suit le GPX :{" "}
                {measuredKm(race.course.distanceM)}
                {race.course.elevationGainM !== null &&
                  ` et +${formatInteger(race.course.elevationGainM)} m`}{" "}
                mesurés. La distance annoncée sert au calendrier et à la saison.
              </p>
            )}
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
          {kind === "trail" && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-4">
              <span id="race-poles" className="font-medium">
                Bâtons
              </span>
              <div
                role="group"
                aria-labelledby="race-poles"
                className="flex gap-0.5 rounded-md border border-border bg-card p-0.5"
              >
                {(["allowed", "forbidden", "unknown"] as const).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={poles === option}
                      onClick={() =>
                        setPoles((current) =>
                          current === option ? null : option,
                        )
                      }
                      className={segment}
                    >
                      {poleLabels[option]}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
          {mode === "create" && kind === "trail" && (
            <div className="border-t border-border pt-4">
              <input
                ref={gpxInput}
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                aria-label="Fichier GPX de la course"
                className="sr-only"
                onChange={(event) => {
                  void pickGpx(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {gpx ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3">
                  <CircleCheckIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-primary"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {gpx.file.name}
                    </span>
                    <span className="text-label text-pretty text-secondary-foreground tabular-nums">
                      {[
                        `${measuredKm(gpx.summary.distanceM)}${
                          gpx.summary.elevationGainM !== null
                            ? ` et +${formatInteger(gpx.summary.elevationGainM)} m`
                            : ""
                        } mesurés`,
                        Number.isFinite(distanceKm) && distanceKm > 0
                          ? `annoncé ${formatKm(distanceKm)}`
                          : null,
                        gpx.summary.aidStations === 0
                          ? "aucun ravitaillement détecté"
                          : `${gpx.summary.aidStations} ${gpx.summary.aidStations > 1 ? "ravitaillements détectés" : "ravitaillement détecté"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => gpxInput.current?.click()}
                  >
                    Remplacer
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => gpxInput.current?.click()}
                  className="flex w-full items-center gap-3 rounded-lg border border-dashed border-control-border px-3.5 py-3 text-left transition-colors duration-150 ease-stride hover:bg-muted"
                >
                  <UploadIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-secondary-foreground"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">Ajouter le GPX</span>
                    <span className="text-label text-secondary-foreground">
                      Facultatif : Stride en tire la distance, le dénivelé et
                      les ravitos.
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <span id="race-expectation" className="font-medium">
              Ce que tu en attends
            </span>
            <div
              role="group"
              aria-labelledby="race-expectation"
              className="flex gap-0.5 rounded-md border border-border bg-card p-0.5"
            >
              {(["performance", "rehearsal", "fun"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={expectation === option}
                  onClick={() =>
                    setExpectation((current) =>
                      current === option ? null : option,
                    )
                  }
                  className={segment}
                >
                  {expectationLabels[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-5">
            <Field
              label="Temps visé · facultatif"
              htmlFor="race-target"
              className="max-w-sm"
              error={show(errors.target)}
              hint={
                estimate?.text ??
                "Format 18h30. Tu pourras l’ajuster depuis le plan de course."
              }
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
          <fieldset className="flex flex-col gap-2.5 border-t border-border pt-5">
            <legend className="float-left mb-2.5 font-medium">
              À tester ce jour-là
              <span className="ml-2 font-normal text-muted-foreground">
                facultatif · {testItems.length} / {maxRaceTestItems}
              </span>
            </legend>
            <div className="clear-left flex flex-wrap gap-1.5">
              {[
                ...new Set([
                  ...(priority === "A"
                    ? testSuggestions(kind)
                    : tailoredTests(kind, primary, testSuggestions(kind))),
                  ...testItems,
                ]),
              ].map((item) => {
                const chosen = testItems.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={chosen}
                    disabled={!chosen && testItems.length >= maxRaceTestItems}
                    onClick={() =>
                      setTestItems((current) =>
                        chosen
                          ? current.filter((value) => value !== item)
                          : [...current, item],
                      )
                    }
                    className="inline-flex min-h-control-touch items-center rounded-md border border-border bg-card px-2.5 text-secondary-foreground transition-colors duration-150 ease-stride hover:text-foreground disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:min-h-7"
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex max-w-sm gap-2">
              <Input
                aria-label="Autre chose à tester"
                placeholder="Autre chose à tester"
                value={customTest}
                maxLength={60}
                onChange={(event) => setCustomTest(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addCustomTest();
                }}
                className={fieldInput}
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  !customTest.trim() || testItems.length >= maxRaceTestItems
                }
                onClick={addCustomTest}
              >
                Ajouter
              </Button>
            </div>
          </fieldset>
          <p className="flex max-w-170 items-start gap-2.5 text-pretty">
            <StrideMark className="mt-1 size-3.5 shrink-0" />
            {priorityComment(priority, primaryName)}
          </p>
        </>
      )}

      {step === 3 && (
        <>
          {mode === "create" && hasPlan && savedId ? (
            <RacePlanEffect
              raceId={savedId}
              name={raceName}
              priority={priority}
              dateLabel={isoDate ? formatLongFrenchDate(isoDate) : null}
            />
          ) : (
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
          )}
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
            {step === 2 ? (
              <>
                <span className="md:hidden">Voir l’effet</span>
                <span className="max-md:hidden">Voir l’effet sur le plan</span>
              </>
            ) : (
              "Continuer"
            )}
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
