"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUpRightIcon,
  CheckIcon,
  FileTextIcon,
  HistoryIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StrideMark } from "@/components/stride/stride-mark";
import { Widget } from "@/components/stride/widget";
import { formatInteger, formatKm } from "../format";
import { actionMessage, importMessage } from "../messages";
import {
  formatShortDate,
  type CourseActivity,
  type RaceSummary,
} from "../race";
import {
  importCourseFromActivity,
  showImportedRace,
} from "@/server/races/actions";
import {
  CourseReplacementCard,
  type CoursePreviewData,
} from "./course-replacement-card";
import { RaceCard } from "./race-ui";

const benefits = [
  ["La carte et le profil altimétrique", "Carte et profil"],
  [
    "Les points de passage du GPX, ou ceux que tu ajoutes",
    "Points de passage, détectés ou ajoutés",
  ],
  [
    "Les portions à marcher, selon la pente que tu choisis",
    "Portions à marcher selon ta pente",
  ],
  [
    "Les passages de nuit, calculés avec ton heure de départ",
    "Passages de nuit",
  ],
  [
    "La météo heure par heure, placée le long du parcours",
    "Météo le long du parcours",
  ],
  [
    "Une course .fit avec alertes à charger sur ta montre",
    "Course .fit avec alertes pour ta montre",
  ],
] as const;

export async function uploadTo(url: string, body: FormData) {
  const response = await fetch(url, { method: "POST", body });
  const result = (await response.json().catch(() => ({ status: "error" }))) as {
    status: string;
    preview?: CoursePreviewData;
  };
  return result;
}

type Replacement = { preview: CoursePreviewData; confirm: () => void };

export function CourseImport({
  race,
  activities,
  replacing,
}: {
  race: RaceSummary;
  activities: CourseActivity[];
  replacing: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"link" | "activity" | null>(null);
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [pending, startTransition] = useTransition();

  function imported() {
    toast.success(replacing ? "Tracé remplacé." : "Parcours importé.");
    setLinkError(null);
    setDialog(null);
    setReplacement(null);
  }

  function review(preview: CoursePreviewData, confirm: () => void) {
    setLinkError(null);
    setDialog(null);
    setReplacement({ preview, confirm });
  }

  function sendFile(file: File | undefined, confirmed = false) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(importMessage("too-large"));
      return;
    }
    const body = new FormData();
    body.set("file", file);
    if (confirmed) body.set("confirm", "1");
    startTransition(async () => {
      const result = await uploadTo(`/api/races/${race.id}/course`, body);
      if (result.status === "preview" && result.preview)
        review(result.preview, () => sendFile(file, true));
      else if (result.status === "saved") {
        imported();
        await showImportedRace(race.id, "root");
      } else toast.error(importMessage(result.status));
    });
  }

  function sendRoadbook(file: File | undefined) {
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    startTransition(async () => {
      const result = await uploadTo(`/api/races/${race.id}/roadbook`, body);
      if (result.status === "roadbook-saved") {
        toast.success("Roadbook importé.");
        await showImportedRace(race.id, "waypoints");
      } else toast.error(importMessage(result.status));
    });
  }

  function sendLink(form: FormData) {
    sendLinkValue(String(form.get("link") ?? ""));
  }

  function sendLinkValue(link: string, confirmed = false) {
    const body = new FormData();
    body.set("link", link);
    body.set("intent", "course");
    if (confirmed) body.set("confirm", "1");
    setLinkError(null);
    startTransition(async () => {
      const result = await uploadTo(`/api/races/${race.id}/roadbook`, body);
      if (result.status === "course-preview" && result.preview)
        review(result.preview, () => sendLinkValue(link, true));
      else if (result.status === "course-saved") {
        imported();
        await showImportedRace(race.id, "root");
      } else if (result.status === "roadbook-saved") {
        toast.success("Roadbook importé.");
        setLinkError(null);
        setDialog(null);
        await showImportedRace(race.id, "waypoints");
      } else if (
        result.status === "invalid-link" ||
        result.status === "unreachable"
      )
        setLinkError(importMessage(result.status));
      else toast.error(importMessage(result.status));
    });
  }

  function pickActivity(id: string, confirmed = false) {
    startTransition(async () => {
      const result = await importCourseFromActivity(race.id, id, confirmed);
      if (result.status === "preview")
        review(result.preview, () => pickActivity(id, true));
      else if (result.status === "saved") {
        imported();
        await showImportedRace(race.id, "root");
      } else toast.error(actionMessage(result.status));
    });
  }

  const others = [
    {
      key: "link",
      icon: <ArrowUpRightIcon className="size-3.5" />,
      title: "Coller un lien",
      detail: "Site de la course, page Tracedetrail ou UTMB World.",
      disabled: false,
    },
    {
      key: "activity",
      icon: <HistoryIcon className="size-3.5" />,
      title: "Depuis une activité Garmin",
      detail:
        "Si tu as déjà couru tout ou partie du parcours, Stride reprend ton tracé.",
      disabled: activities.length === 0,
    },
    {
      key: "roadbook",
      icon: <FileTextIcon className="size-3.5" />,
      title: "Avec le roadbook PDF",
      detail: replacing
        ? "Stride lit la liste des ravitos, barrières et services, et les place sur le tracé."
        : "Disponible une fois le GPX ajouté : Stride place alors les ravitos, barrières et services sur le tracé.",
      disabled: !replacing,
    },
  ];

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {replacement ? (
        <CourseReplacementCard
          preview={replacement.preview}
          pending={pending}
          onCancel={() => setReplacement(null)}
          onConfirm={replacement.confirm}
        />
      ) : (
        <RaceCard className="gap-0 overflow-hidden p-0">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              sendFile(event.dataTransfer.files[0]);
            }}
            className={cn(
              "m-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-control-border bg-muted px-6 py-8 text-center transition-colors sm:py-12",
              dragging && "border-primary bg-card",
            )}
            aria-busy={pending}
          >
            <span className="grid size-10 place-items-center rounded-lg border border-control-border bg-card text-secondary-foreground">
              <UploadIcon className="size-4.5" />
            </span>
            <h2 className="text-body-lg font-semibold">
              {replacing
                ? "Remplace le GPX de la course"
                : "Ajoute le GPX de la course"}
            </h2>
            <p className="max-w-105 text-body text-secondary-foreground">
              <span className="max-sm:hidden">
                Glisse ici le fichier .gpx fourni par l’organisation. Un seul
                fichier, 20 Mo maximum.
              </span>
              <span className="sm:hidden">
                Le fichier .gpx fourni par l’organisation, depuis tes fichiers
                ou un lien.
              </span>
            </p>
            <input
              ref={input}
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => sendFile(event.target.files?.[0])}
            />
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => sendRoadbook(event.target.files?.[0])}
            />
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Button
                type="button"
                onClick={() => input.current?.click()}
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Import en cours…" : "Choisir un fichier"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="sm:hidden"
                onClick={() => setDialog("link")}
              >
                Coller un lien
              </Button>
            </div>
          </div>
          <div className="px-4 pb-3.5 max-sm:hidden">
            <span className="text-label font-medium text-muted-foreground">
              Autres façons de l’ajouter
            </span>
            {others.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  if (option.key === "roadbook") pdfInput.current?.click();
                  else setDialog(option.key === "link" ? "link" : "activity");
                }}
                disabled={option.disabled || pending}
                className="flex w-full items-start gap-3 border-t border-border py-3 text-left transition-colors first-of-type:mt-2 focus-visible:outline-2 focus-visible:outline-ring enabled:hover:bg-muted disabled:opacity-50"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-control-border text-secondary-foreground">
                  {option.icon}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-body font-medium">{option.title}</span>
                  <span className="text-body text-muted-foreground">
                    {option.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </RaceCard>
      )}
      <div className="flex flex-col gap-3">
        <Widget
          headingLevel={2}
          aria-labelledby="course-benefits"
          title={<span id="course-benefits">Ce que Stride en tire</span>}
        >
          <ul>
            {benefits.map(([long, short]) => (
              <li
                key={long}
                className="flex gap-2.5 border-b border-border py-2 text-body last:border-b-0"
              >
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="max-sm:hidden">{long}</span>
                <span className="sm:hidden">{short}</span>
              </li>
            ))}
          </ul>
        </Widget>
        {!replacing && (
          <Widget
            headingLevel={2}
            aria-labelledby="course-waiting"
            icon={<StrideMark />}
            title={<span id="course-waiting">En attendant</span>}
          >
            <p className="text-body text-secondary-foreground">
              Sans GPX, Stride ne connaît que{" "}
              {race.distanceKm
                ? `les ${formatInteger(race.distanceKm)} km`
                : "la distance"}
              {race.elevationGainM !== null
                ? ` et les ${formatInteger(race.elevationGainM)} m de D+`
                : ""}{" "}
              annoncés : les passages aux ravitos que tu saisis restent une
              estimation, sans nuit ni météo le long du parcours.
            </p>
          </Widget>
        )}
      </div>
      <Dialog
        open={dialog === "link"}
        onOpenChange={(open) => setDialog(open ? "link" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coller un lien</DialogTitle>
            <DialogDescription>
              Lien direct vers un fichier .gpx, ou page de la course qui en
              propose un. Stride récupère le tracé et, s’il le trouve, le
              roadbook.
            </DialogDescription>
          </DialogHeader>
          <form action={sendLink} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="course-link">Adresse</FieldLabel>
              <Input
                id="course-link"
                name="link"
                type="url"
                inputMode="url"
                required
                placeholder="https://"
              />
            </Field>
            {linkError && (
              <p role="alert" className="text-body text-warning">
                {linkError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {pending ? "Récupération…" : "Importer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialog === "activity"}
        onOpenChange={(open) => setDialog(open ? "activity" : null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Depuis une activité Garmin</DialogTitle>
            <DialogDescription>
              Le tracé GPS de l’activité devient le parcours de la course.
            </DialogDescription>
          </DialogHeader>
          <ul className="-mx-1 flex max-h-96 flex-col overflow-y-auto">
            {activities.map((activity) => (
              <li key={activity.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pickActivity(activity.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body">{activity.title}</span>
                    <span className="text-label text-muted-foreground">
                      {formatShortDate(activity.date)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {activity.distanceM
                      ? `${formatKm(activity.distanceM)} km`
                      : ""}
                    {activity.elevationGainM
                      ? ` · +${formatInteger(activity.elevationGainM)} m`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
