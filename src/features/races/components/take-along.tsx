"use client";

import { useRef, useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatKm } from "../format";
import {
  roadbookFormatLabels,
  roadbookFormats,
  roadbookQuery,
  type RoadbookOptions,
} from "../printed-roadbook";

type WatchContents = {
  distanceM: number;
  points: number;
  instructions: number;
};

function counted(count: number, singular: string, plural: string) {
  return `${count} ${count > 1 ? plural : singular}`;
}

function watchSummary(contents: WatchContents) {
  return [
    `le tracé de ${formatKm(contents.distanceM)} km`,
    counted(contents.points, "point de passage", "points de passage"),
    contents.instructions
      ? counted(contents.instructions, "consigne", "consignes")
      : null,
  ]
    .filter(Boolean)
    .join(", ");
}

async function download(url: string, fallbackName: string) {
  const response = await fetch(url);
  if (!response.ok) return false;
  const blob = await response.blob();
  const name =
    response.headers
      .get("content-disposition")
      ?.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

function WatchDialog({
  raceId,
  contents,
}: {
  raceId: string;
  contents: WatchContents;
}) {
  const [pending, startTransition] = useTransition();
  const summary = watchSummary(contents);

  function send(format: "fit" | "gpx") {
    startTransition(async () => {
      const saved = await download(
        `/api/races/${raceId}/export?format=${format}`,
        `course.${format}`,
      ).catch(() => false);
      if (saved)
        toast.success(
          `${format === "fit" ? "Course .fit" : "GPX enrichi"} téléchargé : ${summary}.`,
        );
      else
        toast.error(
          "Impossible de préparer le fichier pour la montre. Réessaie dans un instant.",
        );
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Envoyer sur la montre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer sur la montre</DialogTitle>
          <DialogDescription>
            Stride prépare la course au format .fit, à importer dans Garmin
            Connect, rubrique Parcours, puis à synchroniser avec ta montre.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <h3 className="text-label font-medium text-secondary-foreground">
            Dans le fichier
          </h3>
          <p className="text-body">
            {summary.replace(/^./, (letter) => letter.toUpperCase())}, avec
            l’alerte réglée sur chaque point.
          </p>
        </div>
        <p className="text-label text-muted-foreground">
          L’envoi direct sur ta montre arrivera avec la connexion Garmin
          officielle. Stride n’écrit jamais sur ton compte Garmin.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => send("gpx")}
          >
            <DownloadIcon />
            GPX enrichi
          </Button>
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => send("fit")}
          >
            <DownloadIcon />
            Télécharger la course .fit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const toggles: { key: "intake" | "weather" | "walk"; label: string }[] = [
  { key: "intake", label: "Ravitaillement" },
  { key: "weather", label: "Météo" },
  { key: "walk", label: "Marche" },
];

function RoadbookDialog({ raceId }: { raceId: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [options, setOptions] = useState<RoadbookOptions>({
    format: "a4",
    intake: true,
    weather: true,
    walk: true,
  });
  const src = `/races/${raceId}/print?${roadbookQuery(options)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Carnet de route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-240">
        <DialogHeader>
          <DialogTitle>Carnet de route</DialogTitle>
          <DialogDescription>
            Le carnet suit ton plan tel qu’il est au moment de l’impression.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
          <iframe
            ref={frame}
            src={src}
            title="Aperçu du carnet de route"
            className="h-90 w-full rounded-lg border border-border bg-card md:h-110"
          />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span
                id="roadbook-format"
                className="text-label text-secondary-foreground"
              >
                Format
              </span>
              <div
                role="group"
                aria-labelledby="roadbook-format"
                className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5"
              >
                {roadbookFormats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    aria-pressed={options.format === format}
                    onClick={() =>
                      setOptions((current) => ({ ...current, format }))
                    }
                    className="inline-flex min-h-control-touch items-center rounded-md px-2.5 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
                  >
                    {roadbookFormatLabels[format]}
                  </button>
                ))}
              </div>
            </div>
            {options.format !== "band" &&
              toggles.map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center justify-between gap-3 border-b border-border py-1.5"
                >
                  <span>{toggle.label}</span>
                  <Switch
                    checked={options[toggle.key]}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({
                        ...current,
                        [toggle.key]: checked,
                      }))
                    }
                  />
                </label>
              ))}
            <p className="text-label text-muted-foreground">
              Imprimé en clair, quel que soit ton thème.
              {options.format === "band"
                ? " Le bracelet ne garde que les heures de passage et les barrières."
                : " Pour un PDF, choisis « Enregistrer au format PDF » dans la fenêtre d’impression."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button asChild variant="outline">
            <a href={`${src}&print=1`} target="_blank" rel="noopener">
              Ouvrir dans un onglet
            </a>
          </Button>
          <Button
            type="button"
            onClick={() => frame.current?.contentWindow?.print()}
          >
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TakeAlong({
  raceId,
  watch,
}: {
  raceId: string;
  watch: WatchContents | null;
}) {
  return (
    <section
      aria-labelledby="take-along"
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <h2
        id="take-along"
        className="text-body font-medium text-secondary-foreground"
      >
        Emporter le plan
      </h2>
      <div className="flex flex-wrap gap-2">
        {watch && <WatchDialog raceId={raceId} contents={watch} />}
        <RoadbookDialog raceId={raceId} />
      </div>
      <p className="text-label text-muted-foreground">
        {watch
          ? `Sur la montre : ${watchSummary(watch)}, en fichier .fit.`
          : "Sans tracé, seul le carnet de route s’emporte."}
      </p>
    </section>
  );
}
