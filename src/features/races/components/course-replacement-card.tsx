"use client";

import { useState } from "react";
import { FlagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatInteger } from "../format";
import type { CourseReplacement, ReplacementRow } from "../course-replacement";

export type CoursePreviewData = Omit<CourseReplacement, "carry"> & {
  fileName: string;
  sourceLabel: string;
};

const trailing = new Set(["walk", "arrival"]);

function orderedRows(preview: CoursePreviewData): ReplacementRow[] {
  return [
    ...preview.rows.filter((row) => !trailing.has(row.key)),
    ...preview.moves.map((move) => ({
      key: `move-${move.name}`,
      label: move.name,
      current: move.current,
      next: move.next,
      delta: move.delta,
    })),
    ...preview.rows.filter((row) => trailing.has(row.key)),
  ];
}

function BothRoutes({ routes }: { routes: CoursePreviewData["routes"] }) {
  const all = [...routes.current, ...routes.next];
  const lats = all.map(([lat]) => lat);
  const lons = all.map(([, lon]) => lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const scale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const width = Math.max(1e-6, (Math.max(...lons) - minLon) * scale);
  const height = Math.max(1e-6, maxLat - minLat);
  const size = Math.max(width, height);
  const x = (lon: number) =>
    (((lon - minLon) * scale + (size - width) / 2) / size) * 100;
  const y = (lat: number) =>
    ((maxLat - lat + (size - height) / 2) / size) * 100;
  const path = (points: [number, number][]) =>
    points
      .map(
        ([lat, lon], index) =>
          `${index ? "L" : "M"}${x(lon).toFixed(2)},${y(lat).toFixed(2)}`,
      )
      .join("");
  return (
    <figure className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label="Les deux tracés superposés"
        viewBox="-4 -4 108 108"
        className="aspect-square max-h-64 w-full rounded-lg border border-border bg-muted"
      >
        <path
          d={path(routes.current)}
          className="fill-none stroke-secondary-foreground"
          strokeWidth={1.4}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path(routes.next)}
          className="fill-none stroke-primary"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="flex gap-4 text-label text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-3.5 border-t-2 border-dashed border-secondary-foreground"
          />
          Aujourd’hui
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-3.5 bg-primary" />
          Nouveau tracé
        </span>
      </figcaption>
    </figure>
  );
}

function ReplacementBody({ preview }: { preview: CoursePreviewData }) {
  const rows = orderedRows(preview);
  const head = "py-2 text-right text-label font-normal text-muted-foreground";
  return (
    <div className="flex flex-col gap-3.5">
      <p className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5">
        <FlagIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{preview.fileName}</span>
          <span className="text-label text-muted-foreground tabular-nums">
            {formatInteger(preview.pointCount)} points · {preview.sourceLabel}
          </span>
        </span>
      </p>
      <table className="w-full border-collapse text-body max-sm:hidden">
        <caption className="sr-only">Ce qui change</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={`${head} text-left`}>
              <span className="sr-only">Mesure</span>
            </th>
            <th scope="col" className={head}>
              Aujourd’hui
            </th>
            <th scope="col" className={head}>
              Nouveau tracé
            </th>
            <th scope="col" className={head}>
              Écart
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border">
              <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                {row.label}
              </th>
              <td className="px-2 py-2.5 text-right text-secondary-foreground tabular-nums">
                {row.current}
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                {row.next}
              </td>
              <td className="py-2.5 pl-2 text-right tabular-nums">
                {row.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl aria-label="Ce qui change" className="flex flex-col sm:hidden">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 border-b border-border py-2.5"
          >
            <dt className="font-medium">{row.label}</dt>
            <dd className="text-label text-secondary-foreground tabular-nums">
              {row.current} → {row.next}
            </dd>
            <dd className="text-right font-semibold tabular-nums">
              {row.delta}
            </dd>
          </div>
        ))}
      </dl>
      {(preview.removed.length > 0 || preview.added.length > 0) && (
        <div className="flex flex-col gap-1 text-body">
          {preview.removed.length > 0 && (
            <p>
              <span className="font-medium">Retirés avec l’ancien GPX : </span>
              <span className="text-secondary-foreground">
                {preview.removed.join(", ")}
              </span>
            </p>
          )}
          {preview.added.length > 0 && (
            <p>
              <span className="font-medium">Nouveaux dans ce GPX : </span>
              <span className="text-secondary-foreground">
                {preview.added.join(", ")}
              </span>
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-label font-medium text-secondary-foreground">
          Ce qui est gardé
        </h3>
        <p className="text-body text-pretty">{preview.kept}</p>
      </div>
    </div>
  );
}

export function CourseReplacementCard({
  preview,
  pending,
  onCancel,
  onConfirm,
}: {
  preview: CoursePreviewData;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const mobile = useIsMobile();
  const [map, setMap] = useState(false);
  const description =
    "Rien ne change tant que tu n’as pas choisi « Remplacer ».";
  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onCancel}
        className="flex-1 sm:flex-none"
      >
        Annuler
      </Button>
      <Button
        type="button"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={onConfirm}
        className="flex-1 sm:flex-none"
      >
        Remplacer
      </Button>
    </>
  );
  const onOpenChange = (open: boolean) => {
    if (!open && !pending) onCancel();
  };
  if (mobile)
    return (
      <Sheet open onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>Remplacer le tracé</SheetTitle>
            <SheetDescription className="sr-only">
              {description}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <ReplacementBody preview={preview} />
          </div>
          <div className="flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {actions}
          </div>
        </SheetContent>
      </Sheet>
    );
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-140">
        <DialogHeader>
          <DialogTitle>Remplacer le tracé</DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </DialogHeader>
        <ReplacementBody preview={preview} />
        {map && <BothRoutes routes={preview.routes} />}
        <DialogFooter className="items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            aria-pressed={map}
            onClick={() => setMap((value) => !value)}
          >
            {map
              ? "Masquer les deux tracés"
              : "Voir les deux tracés sur la carte"}
          </Button>
          <div className="flex gap-2">{actions}</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
