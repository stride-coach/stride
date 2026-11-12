"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { StrideMark } from "@/components/stride/stride-mark";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileChart } from "./profile-chart";
import { RaceMap, type MapLayers } from "./race-map";
import { CardLabel, RaceCard } from "./race-ui";
import { actionMessage, importMessage } from "../messages";
import {
  formatClock,
  formatKm,
  formatMargin,
  parseClock,
  parseKm,
} from "../format";
import type { MapData } from "../map";
import type { ProfileData } from "../profile";
import {
  alertDistances,
  defaultWatchLabel,
  editableKinds,
  kindLabels,
  serviceLabels,
  services,
  stationKinds,
  type Waypoint,
  type WaypointInput,
  type WaypointMark,
} from "../waypoints";
import type { Passage } from "../simulation";
import { deleteWaypoint, saveWaypoint } from "@/server/races/actions";

const mapLayers: MapLayers = {
  markers: true,
  walk: false,
  night: true,
  rain: false,
};

const chipClass =
  "min-h-control-touch rounded-md border border-border px-2.5 font-normal text-secondary-foreground hover:text-foreground data-[state=on]:border-control-border data-[state=on]:bg-muted data-[state=on]:font-medium data-[state=on]:text-foreground lg:min-h-control";

function counted(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? plural : singular}`;
}

function isInstruction(point: Pick<Waypoint, "kind">) {
  return point.kind === "instruction" || point.kind === "caution";
}

function initialInput(
  point: Waypoint | null,
  distanceM: number,
): WaypointInput {
  return {
    kind:
      point?.kind === "start" || point?.kind === "finish"
        ? "aid"
        : (point?.kind ?? "aid"),
    name: point?.name ?? "Nouveau point",
    distanceM: point?.distanceM ?? distanceM,
    cutoffMinutes: point?.cutoffMinutes ?? null,
    services: point?.services ?? [],
    watchLabel: point?.watchLabel ?? null,
    alertDistanceM: point?.alertDistanceM ?? 500,
    voiceNote: point?.voiceNote ?? null,
    todo: point?.todo ?? null,
    nutritionNote: point?.nutritionNote ?? null,
  };
}

function WaypointBadge({
  mark,
  active,
}: {
  mark: WaypointMark;
  active: boolean;
}) {
  if (mark.shape === "diamond" || mark.shape === "triangle")
    return (
      <span
        aria-hidden="true"
        className="flex size-5.5 items-center justify-center"
      >
        <span
          className={cn(
            "size-2.5 rotate-45 border-2",
            mark.shape === "triangle"
              ? "border-secondary-foreground"
              : mark.tone === "caution"
                ? "border-warning"
                : "border-data-2",
          )}
        />
      </span>
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 items-center justify-center border text-label leading-none font-semibold tabular-nums",
        mark.shape === "square" ? "rounded-md" : "rounded-full",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : mark.shape === "square"
            ? "border-data-2 bg-background text-foreground"
            : "border-foreground bg-background text-foreground",
      )}
    >
      {mark.label}
    </span>
  );
}

function WaypointRow({
  point,
  mark,
  active,
  onSelect,
}: {
  point: Waypoint;
  mark: WaypointMark;
  active: boolean;
  onSelect: () => void;
}) {
  const instruction = isInstruction(point);
  const details = [
    `km ${formatKm(point.distanceM)}`,
    instruction ? point.name : null,
    point.cutoffMinutes !== null
      ? `BH ${formatClock(point.cutoffMinutes)}`
      : null,
    point.needsReview ? "À vérifier" : null,
  ].filter(Boolean);
  const signal = instruction
    ? point.voiceNote
      ? "Vocal"
      : null
    : point.kind !== "start" && point.alertDistanceM > 0
      ? "Alerte"
      : null;
  const content = (
    <>
      <WaypointBadge mark={mark} active={active} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate",
            active ? "font-semibold" : "font-medium",
            point.kind === "caution" && "text-warning",
            point.kind === "instruction" && "text-muted-foreground",
          )}
        >
          {instruction ? kindLabels[point.kind] : point.name}
        </span>
        <span className="truncate text-label text-muted-foreground">
          {details.join(" · ")}
        </span>
      </span>
      <span className="text-label text-muted-foreground">{signal}</span>
    </>
  );
  const rowClass =
    "grid min-h-row-touch w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2 py-1.5 text-left lg:min-h-row";
  if (point.kind === "start" || point.kind === "finish")
    return <div className={rowClass}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        rowClass,
        "transition-colors duration-150 ease-stride hover:bg-muted aria-current:bg-muted",
      )}
    >
      {content}
    </button>
  );
}

function WatchPreview({
  label,
  alertDistanceM,
  distanceM,
}: {
  label: string;
  alertDistanceM: number;
  distanceM: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex size-33 shrink-0 flex-col items-center justify-center gap-1 rounded-full border-6 border-muted bg-background px-3 text-center"
    >
      <span className="text-micro text-muted-foreground tabular-nums">
        {alertDistanceM === 0
          ? "Au point"
          : `Dans ${alertDistanceM.toLocaleString("fr-FR")} m`}
      </span>
      <span className="text-body-lg leading-none font-semibold break-all text-foreground tabular-nums">
        {label}
      </span>
      <span className="text-label text-primary tabular-nums">
        km {formatKm(distanceM)}
      </span>
    </div>
  );
}

function WaypointEditor({
  raceId,
  point,
  mark,
  pickedDistanceM,
  courseDistanceM,
  passage,
  estimate,
  km,
  onKmChange,
  stops,
  titled = true,
  onSaved,
  onDeleted,
  onCancel,
}: {
  raceId: string;
  point: Waypoint | null;
  mark: WaypointMark | null;
  pickedDistanceM: number;
  courseDistanceM: number;
  passage: Passage | undefined;
  estimate: boolean;
  km: string;
  onKmChange: (value: string) => void;
  stops: { aidStopSeconds: number; waterStopSeconds: number };
  titled?: boolean;
  onSaved: (id: string | null) => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(() =>
    initialInput(point, pickedDistanceM),
  );
  const [stop, setStop] = useState(() =>
    point?.stopSeconds == null
      ? ""
      : String(Math.round(point.stopSeconds / 60)),
  );
  const [cutoff, setCutoff] = useState(() =>
    point?.cutoffMinutes == null ? "" : formatClock(point.cutoffMinutes),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof WaypointInput>(
    key: K,
    value: WaypointInput[K],
  ) => setInput((current) => ({ ...current, [key]: value }));
  const fallbackLabel =
    point && mark ? defaultWatchLabel(point, mark) : input.name.slice(0, 24);
  const watchLabel = input.watchLabel ?? fallbackLabel;
  const previewDistance = parseKm(km) ?? point?.distanceM ?? pickedDistanceM;

  const station = stationKinds.includes(input.kind);
  const defaultStop =
    input.kind === "water" ? stops.waterStopSeconds : stops.aidStopSeconds;

  function save() {
    const meters = parseKm(km);
    const minutes = cutoff.trim() ? parseClock(cutoff) : null;
    const stopMinutes = stop.trim() === "" ? null : Number(stop.trim());
    if (
      meters === null ||
      meters < 0 ||
      meters > courseDistanceM ||
      (cutoff.trim() && minutes === null)
    )
      return setError("Vérifie le kilomètre et la barrière horaire.");
    if (
      stopMinutes !== null &&
      (!Number.isInteger(stopMinutes) || stopMinutes < 0 || stopMinutes > 120)
    )
      return setError("L’arrêt prévu va de 0 à 120 minutes.");
    setError(null);
    startTransition(async () => {
      const result = await saveWaypoint(raceId, point?.id ?? null, {
        ...input,
        distanceM: meters,
        cutoffMinutes: minutes,
        stopSeconds: station && stopMinutes !== null ? stopMinutes * 60 : null,
      });
      if (result.status === "saved") {
        toast.success("Point enregistré.");
        onSaved(result.id ?? point?.id ?? null);
      } else toast.error(actionMessage(result.status));
    });
  }

  function remove() {
    if (!point) return;
    startTransition(async () => {
      const result = await deleteWaypoint(raceId, point.id);
      if (result.status === "saved") {
        toast.success("Point supprimé.");
        onDeleted();
      } else toast.error(actionMessage(result.status));
    });
  }

  return (
    <section
      aria-label={point ? `Modifier ${point.name}` : "Ajouter un point"}
      className={cn(
        "flex min-w-0 flex-col gap-3.5",
        titled &&
          "rounded-xl border border-border bg-card px-4 py-3.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
      )}
    >
      {titled && (
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body-lg font-semibold">
            {point ? `Modifier · ${point.name}` : "Ajouter un point"}
          </h3>
          <span className="text-label text-muted-foreground tabular-nums">
            {passage
              ? `passage prévu ${formatClock(passage.clockMinutes)}`
              : `km ${formatKm(previewDistance)}`}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <span
          id="waypoint-kind"
          className="text-label text-secondary-foreground"
        >
          Type
        </span>
        <div
          role="group"
          aria-labelledby="waypoint-kind"
          className="flex flex-wrap gap-1.5"
        >
          {editableKinds.map((kind) => (
            <Toggle
              key={kind}
              variant="segment"
              pressed={input.kind === kind}
              onPressedChange={() => set("kind", kind)}
              className={chipClass}
            >
              {kindLabels[kind]}
            </Toggle>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="col-span-full flex flex-col gap-1.5">
          <span className="text-label text-secondary-foreground">Nom</span>
          <Input
            value={input.name}
            maxLength={60}
            className="h-control-touch rounded-lg bg-card lg:h-control"
            onChange={(event) => set("name", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-secondary-foreground">Km</span>
          <Input
            value={km}
            inputMode="decimal"
            className="h-control-touch rounded-lg bg-card lg:h-control"
            onChange={(event) => onKmChange(event.target.value)}
          />
          <span className="text-label text-muted-foreground">
            {estimate ? "Kilomètre annoncé" : "Accroché au tracé"}
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-secondary-foreground">
            Barrière horaire
          </span>
          <Input
            value={cutoff}
            placeholder="HH:MM"
            inputMode="numeric"
            className="h-control-touch rounded-lg bg-card lg:h-control"
            onChange={(event) => setCutoff(event.target.value)}
          />
          {passage?.marginSeconds != null && (
            <span
              className={cn(
                "text-label",
                passage.marginSeconds < 0 ? "text-destructive" : "text-primary",
              )}
            >
              Marge prévue {formatMargin(passage.marginSeconds)}
            </span>
          )}
        </label>
        {station && (
          <label className="flex flex-col gap-1.5">
            <span className="text-label text-secondary-foreground">
              Arrêt prévu (min)
            </span>
            <Input
              value={stop}
              inputMode="numeric"
              placeholder={String(Math.round(defaultStop / 60))}
              className="h-control-touch rounded-lg bg-card lg:h-control"
              onChange={(event) => setStop(event.target.value)}
            />
            <span className="text-label text-muted-foreground">
              Vide : {Math.round(defaultStop / 60)} min, comme les autres{" "}
              {input.kind === "water" ? "points d’eau" : "ravitos"}
            </span>
          </label>
        )}
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-label text-secondary-foreground">
          Services
        </legend>
        <div className="flex flex-wrap gap-x-3.5">
          {services.map((service) => (
            <label
              key={service}
              className="inline-flex min-h-control-touch items-center gap-1.5 text-secondary-foreground lg:min-h-control"
            >
              <Checkbox
                checked={input.services.includes(service)}
                onCheckedChange={(checked) =>
                  set(
                    "services",
                    checked === true
                      ? [...input.services, service]
                      : input.services.filter((item) => item !== service),
                  )
                }
              />
              {serviceLabels[service]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
        <span className="text-label text-secondary-foreground">
          Sur la montre
        </span>
        <div className="flex items-center gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-secondary-foreground">
                Nom affiché
              </span>
              <Input
                value={input.watchLabel ?? ""}
                maxLength={24}
                placeholder={fallbackLabel}
                className="h-control-touch rounded-lg bg-card lg:h-control"
                onChange={(event) =>
                  set("watchLabel", event.target.value || null)
                }
              />
              <span className="text-label text-muted-foreground">
                {counted(watchLabel.length, "caractère", "caractères")} · reste
                court, la montre coupe les noms longs
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-secondary-foreground">
                Prévenir
              </span>
              <select
                className="h-control-touch w-full rounded-lg border border-input bg-card px-2.5 lg:h-control"
                value={input.alertDistanceM}
                onChange={(event) =>
                  set(
                    "alertDistanceM",
                    Number(
                      event.target.value,
                    ) as WaypointInput["alertDistanceM"],
                  )
                }
              >
                {alertDistances.map((distance) => (
                  <option key={distance} value={distance}>
                    {distance === 0
                      ? "Au point"
                      : `${distance.toLocaleString("fr-FR")} m avant`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <WatchPreview
            label={watchLabel}
            alertDistanceM={input.alertDistanceM}
            distanceM={previewDistance}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-secondary-foreground">
            Consigne vocale
          </span>
          <Textarea
            value={input.voiceNote ?? ""}
            maxLength={280}
            className="min-h-16 rounded-lg bg-card"
            onChange={(event) => set("voiceNote", event.target.value || null)}
          />
          <span className="text-label text-muted-foreground">
            Lue à voix haute sur les montres et téléphones qui le permettent,
            affichée sinon.
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-label text-secondary-foreground">À faire</span>
        <Textarea
          value={input.todo ?? ""}
          maxLength={400}
          className="min-h-16 rounded-lg bg-card"
          onChange={(event) => set("todo", event.target.value || null)}
        />
      </label>
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={save}
          className="flex-1 lg:flex-none"
        >
          Enregistrer
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
          className="flex-1 lg:flex-none"
        >
          Annuler
        </Button>
        {point && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={remove}
            className="text-destructive lg:ml-auto"
          >
            Supprimer
          </Button>
        )}
      </div>
      {!estimate && point && (
        <p className="text-label text-muted-foreground">
          Pour le déplacer, glisse le point sur la carte ou change son
          kilomètre. Le passage prévu, la météo et le ravitaillement se
          recalculent.
        </p>
      )}
    </section>
  );
}

function RoadbookImport({ raceId, count }: { raceId: string; count: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [pending, startTransition] = useTransition();

  function importRoadbook(body: FormData) {
    setOpen(false);
    startTransition(async () => {
      const response = await fetch(`/api/races/${raceId}/roadbook`, {
        method: "POST",
        body,
      });
      const result = (await response
        .json()
        .catch(() => ({ status: "error" }))) as {
        status: string;
        points?: number;
        cutoffs?: number;
        review?: string[];
      };
      if (result.status === "roadbook-saved") {
        const points = result.points ?? 0;
        const cutoffs = result.cutoffs ?? 0;
        const review = result.review ?? [];
        const found = cutoffs
          ? `${counted(points, "point", "points")} et ${counted(cutoffs, "barrière", "barrières")}`
          : counted(points, "point", "points");
        toast.success(
          `${found} ${points + cutoffs > 1 ? "trouvés et placés" : "trouvé et placé"} sur le tracé.`,
          review.length
            ? {
                description: `${counted(review.length, "position", "positions")} à vérifier (${review.join(", ")}).`,
              }
            : undefined,
        );
        router.refresh();
      } else toast.error(importMessage(result.status));
    });
  }

  return (
    <RaceCard
      id="import-roadbook"
      className="gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-5"
    >
      <h2 className="flex items-center gap-2 text-label font-medium text-secondary-foreground">
        <StrideMark className="size-3 shrink-0" />
        GPX importé
      </h2>
      <p className="text-secondary-foreground lg:flex-[1_1_420px]">
        {count ? (
          <>
            <b className="font-semibold text-foreground">
              {counted(count, "point de passage", "points de passage")}
            </b>{" "}
            sur le tracé.
          </>
        ) : (
          <>
            Le GPX ne contient{" "}
            <b className="font-semibold text-foreground">
              aucun point de passage
            </b>
            .
          </>
        )}{" "}
        <span className="lg:hidden">
          Touche le tracé pour en ajouter, ou importe le roadbook de la course.
        </span>
        <span className="max-lg:hidden">
          Clique sur le profil ou la carte pour en ajouter, ou laisse Stride les
          lire dans le roadbook de la course.
        </span>
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="Choisir un roadbook PDF"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            const body = new FormData();
            body.set("file", file);
            importRoadbook(body);
          }
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={pending} aria-busy={pending}>
            Importer le roadbook (PDF ou lien)
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer le roadbook</DialogTitle>
            <DialogDescription>
              Stride lit les points de passage et les barrières horaires, puis
              les place sur le tracé.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon />
            Choisir un PDF
          </Button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const body = new FormData();
              body.set("intent", "roadbook");
              body.set("link", link);
              importRoadbook(body);
            }}
          >
            <Input
              type="url"
              required
              placeholder="Lien https vers le roadbook"
              aria-label="Lien vers le roadbook"
              value={link}
              className="h-control-touch lg:h-control"
              onChange={(event) => setLink(event.target.value)}
            />
            <Button type="submit" variant="outline" size="md">
              Importer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {pending && (
        <p
          role="status"
          className="text-label text-muted-foreground lg:basis-full"
        >
          Lecture du roadbook…
        </p>
      )}
    </RaceCard>
  );
}

function WatchExport({
  raceId,
  points,
  instructions,
  compact,
}: {
  raceId: string;
  points: number;
  instructions: number;
  compact: boolean;
}) {
  const contents = instructions
    ? `${points > 1 ? `les ${points} points` : "le point"}, ${instructions > 1 ? `les ${instructions} consignes` : "la consigne"}`
    : points > 1
      ? `les ${points} points`
      : "le point";
  if (compact)
    return (
      <RaceCard className="gap-2.5 lg:hidden">
        <h2 className="text-body font-semibold">Envoyer à ta montre</h2>
        <p className="text-body text-muted-foreground">
          Course .fit avec les points, les consignes et leurs alertes, à
          importer dans Garmin Connect. Stride n’écrit jamais sur ton compte
          Garmin.
        </p>
        <Button asChild>
          <a href={`/api/races/${raceId}/export?format=fit`}>
            <DownloadIcon />
            Télécharger la course .fit
          </a>
        </Button>
      </RaceCard>
    );
  return (
    <RaceCard className="flex-row flex-wrap items-center gap-5 max-lg:hidden">
      <div className="flex flex-[1_1_380px] flex-col gap-1">
        <h2 className="text-body font-semibold">Envoyer à ta montre</h2>
        <p className="text-body text-muted-foreground">
          Télécharge la course au format .fit, avec {contents} et leurs alertes.
          Importe-la ensuite dans Garmin Connect, rubrique Parcours. Stride
          n’écrit jamais sur ton compte Garmin.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <a href={`/api/races/${raceId}/export?format=gpx`}>
            <DownloadIcon />
            GPX enrichi
          </a>
        </Button>
        <Button asChild>
          <a href={`/api/races/${raceId}/export?format=fit`}>
            <DownloadIcon />
            Course .fit
          </a>
        </Button>
      </div>
    </RaceCard>
  );
}

function stopLabel(
  point: Waypoint,
  stops: { aidStopSeconds: number; waterStopSeconds: number },
) {
  if (!stationKinds.includes(point.kind)) return "—";
  const seconds =
    point.stopSeconds ??
    (point.kind === "water" ? stops.waterStopSeconds : stops.aidStopSeconds);
  return `${Math.round(seconds / 60)} min`;
}

function WaypointTable({
  waypoints,
  marks,
  passages,
  stops,
  selectedId,
  onSelect,
}: {
  waypoints: Waypoint[];
  marks: WaypointMark[];
  passages: Passage[];
  stops: { aidStopSeconds: number; waterStopSeconds: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const head =
    "px-2 py-2 text-left text-label font-normal text-muted-foreground";
  const cell = "px-2 py-2 align-middle tabular-nums";
  return (
    <table className="w-full border-collapse text-body max-lg:hidden">
      <thead className="border-b border-border">
        <tr>
          <th scope="col" className={cn(head, "w-8")}>
            <span className="sr-only">Repère</span>
          </th>
          <th scope="col" className={head}>
            Point
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            Au km
          </th>
          <th scope="col" className={head}>
            Type
          </th>
          <th scope="col" className={head}>
            Sur place
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            Barrière
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            Arrêt
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            Passage
          </th>
        </tr>
      </thead>
      <tbody>
        {waypoints.map((point, index) => {
          const fixed = point.kind === "start" || point.kind === "finish";
          const passage = passages.find((item) => item.waypointId === point.id);
          const active = selectedId === point.id;
          return (
            <tr
              key={point.id}
              aria-current={active ? "true" : undefined}
              className="border-b border-border last:border-b-0 aria-current:bg-muted"
            >
              <td className={cell}>
                <WaypointBadge mark={marks[index]} active={active} />
              </td>
              <td className={cn(cell, "font-medium")}>
                {fixed ? (
                  point.name
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(point.id)}
                    className="rounded-sm text-left hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {point.name}
                  </button>
                )}
                {point.needsReview && (
                  <span className="ml-2 text-label text-warning">
                    À vérifier
                  </span>
                )}
              </td>
              <td className={cn(cell, "text-right")}>
                {formatKm(point.distanceM)}
              </td>
              <td className={cn(cell, "text-secondary-foreground")}>
                {kindLabels[point.kind]}
              </td>
              <td className={cn(cell, "text-secondary-foreground")}>
                {point.services.length
                  ? point.services
                      .map((service) => serviceLabels[service].toLowerCase())
                      .join(", ")
                      .replace(/^./, (letter) => letter.toUpperCase())
                  : "—"}
              </td>
              <td className={cn(cell, "text-right")}>
                {point.cutoffMinutes === null
                  ? "—"
                  : formatClock(point.cutoffMinutes)}
              </td>
              <td className={cn(cell, "text-right")}>
                {stopLabel(point, stops)}
              </td>
              <td className={cn(cell, "text-right font-medium")}>
                {passage ? formatClock(passage.clockMinutes) : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function WaypointWorkspace({
  raceId,
  waypoints,
  marks,
  profile,
  map,
  passages,
  distanceM,
  stops,
}: {
  raceId: string;
  waypoints: Waypoint[];
  marks: WaypointMark[];
  profile: ProfileData | null;
  map: MapData | null;
  passages: Passage[];
  distanceM: number;
  stops: { aidStopSeconds: number; waterStopSeconds: number };
}) {
  const estimate = map === null || profile === null;
  const mobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDistance, setNewDistance] = useState<number | null>(null);
  const [km, setKm] = useState("");
  const selected = waypoints.find((point) => point.id === selectedId) ?? null;
  const selectedIndex = selected ? waypoints.indexOf(selected) : -1;
  const stations = waypoints.filter(
    (point) =>
      point.kind !== "start" &&
      point.kind !== "finish" &&
      !isInstruction(point),
  ).length;
  const instructions = waypoints.filter(isInstruction).length;
  const points = waypoints.length - instructions;
  const fromGpx = waypoints.filter((point) => point.source === "gpx").length;
  const added = waypoints.filter(
    (point) => point.source === "athlete" || point.source === "roadbook",
  ).length;
  const summary = `${counted(points, "point", "points")} · ${counted(instructions, "consigne", "consignes")}`;
  const origin = [
    fromGpx ? `${fromGpx} trouvés dans le GPX` : null,
    added ? counted(added, "ajouté", "ajoutés") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const close = () => {
    setSelectedId(null);
    setNewDistance(null);
  };
  const pick = (distance: number) => {
    setSelectedId(null);
    setNewDistance(Math.round(distance));
    setKm(formatKm(Math.round(distance)));
  };
  const select = (id: string) => {
    const point = waypoints.find((item) => item.id === id);
    if (!point || point.kind === "start" || point.kind === "finish") return;
    setNewDistance(null);
    if (selectedId === id) return setSelectedId(null);
    setSelectedId(id);
    setKm(formatKm(point.distanceM));
  };
  const move = (id: string, distance: number) => {
    if (id === selectedId) setKm(formatKm(distance));
  };
  const add = () => {
    setSelectedId(null);
    setNewDistance(0);
    setKm(formatKm(0));
  };
  const editing = selected !== null || newDistance !== null;
  const editorProps = {
    raceId,
    point: selected,
    mark: selectedIndex >= 0 ? marks[selectedIndex] : null,
    pickedDistanceM: newDistance ?? selected?.distanceM ?? 0,
    courseDistanceM: distanceM,
    passage: passages.find((passage) => passage.waypointId === selected?.id),
    estimate,
    km,
    onKmChange: setKm,
    stops,
    onSaved: (id: string | null) => {
      setSelectedId(id);
      setNewDistance(null);
    },
    onDeleted: close,
    onCancel: close,
  };
  const editorKey = selected?.id ?? `new-${newDistance}`;

  return (
    <div className="flex flex-col gap-3">
      {!estimate && <RoadbookImport raceId={raceId} count={stations} />}
      {estimate && (
        <p className="text-body text-secondary-foreground">
          Sans tracé, saisis les ravitaillements avec le kilomètre annoncé par
          l’organisation : le plan de course se découpe à chacun, et les heures
          de passage restent une estimation.
        </p>
      )}
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          {map && (
            <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-muted p-1 lg:pt-0">
              <div className="flex min-h-row items-center justify-between gap-3 px-2.5 max-lg:hidden">
                <span className="font-medium text-secondary-foreground">
                  Carte
                </span>
                <span className="text-label text-muted-foreground">
                  {selected
                    ? "Glisse le point sur le tracé pour le déplacer"
                    : "Clique sur le tracé pour ajouter un point"}
                </span>
              </div>
              <RaceMap
                data={map}
                layers={mapLayers}
                activeId={selectedId}
                onSelect={select}
                onPick={pick}
                onMove={move}
                label={`Carte du parcours, ${formatKm(map.distanceM)} km, ${map.markers.length} points de passage`}
                className="h-50 overflow-hidden rounded-lg border border-border lg:h-75"
              />
            </section>
          )}
          <section className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 lg:gap-2.5 lg:px-4 lg:py-3.5">
            <div className="flex items-center justify-between gap-3 px-1 pb-1.5 lg:p-0">
              <h2 className="text-label font-medium text-secondary-foreground">
                <span className="max-lg:sr-only">Points de passage</span>
                <span className="lg:hidden"> {summary}</span>
              </h2>
              <div className="flex items-center gap-3">
                {origin && (
                  <span className="text-label text-muted-foreground max-lg:hidden">
                    {origin}
                  </span>
                )}
                <Toggle
                  variant="segment"
                  pressed={newDistance !== null}
                  onPressedChange={(pressed) => (pressed ? add() : close())}
                  className={chipClass}
                >
                  + Ajouter
                </Toggle>
              </div>
            </div>
            <WaypointTable
              waypoints={waypoints}
              marks={marks}
              passages={passages}
              stops={stops}
              selectedId={selectedId}
              onSelect={select}
            />
            <ol className="flex flex-col lg:hidden">
              {waypoints.map((point, index) => (
                <li key={point.id}>
                  <WaypointRow
                    point={point}
                    mark={marks[index]}
                    active={selectedId === point.id}
                    onSelect={() => select(point.id)}
                  />
                </li>
              ))}
            </ol>
          </section>
          {map && profile && (
            <RaceCard className="relative max-md:hidden">
              <CardLabel>Profil · survole pour placer un point</CardLabel>
              <ProfileChart
                data={profile}
                variant="editor"
                activeId={selectedId}
                onPick={pick}
                label="Profil altimétrique interactif : cliquer pour ajouter un point"
              />
            </RaceCard>
          )}
        </div>
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-4 lg:py-3.5">
          {editing && !mobile ? (
            <WaypointEditor key={editorKey} {...editorProps} />
          ) : (
            !estimate && (
              <WatchExport
                raceId={raceId}
                points={points}
                instructions={instructions}
                compact={false}
              />
            )
          )}
        </aside>
      </div>
      <Sheet open={editing && mobile} onOpenChange={(open) => !open && close()}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[90dvh] gap-3 overflow-y-auto rounded-t-2xl border-control-border bg-card px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <span
            aria-hidden="true"
            className="h-1 w-9 self-center rounded-mark bg-control-border"
          />
          <div className="flex items-baseline justify-between gap-3">
            <SheetTitle className="text-body-lg font-semibold">
              {selected ? `Modifier · ${selected.name}` : "Ajouter un point"}
            </SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Fermer
              </Button>
            </SheetClose>
          </div>
          {editing && mobile && (
            <WaypointEditor key={editorKey} {...editorProps} titled={false} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
