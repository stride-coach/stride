import { FlagIcon } from "lucide-react";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import type { CourseReplacement } from "../course-replacement";

export type CoursePreviewData = Omit<CourseReplacement, "carry"> & {
  fileName: string;
};

function Change({
  label,
  current,
  next,
  delta,
}: {
  label: string;
  current: string;
  next: string;
  delta: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-border py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_6rem]">
      <dt className="font-medium">{label}</dt>
      <dd className="text-secondary-foreground tabular-nums max-sm:order-3 max-sm:col-span-2">
        {current} → {next}
      </dd>
      <dd className="text-right font-semibold tabular-nums">{delta}</dd>
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
  return (
    <Widget
      headingLevel={2}
      aria-labelledby="course-replacement"
      title={<span id="course-replacement">Remplacer le tracé</span>}
    >
      <div className="flex flex-col gap-3.5">
        <p className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
          <FlagIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 truncate font-medium">
            {preview.fileName}
          </span>
        </p>
        <dl aria-label="Ce qui change" className="flex flex-col">
          {preview.rows.map((row) => (
            <Change
              key={row.key}
              label={row.label}
              current={row.current}
              next={row.next}
              delta={row.delta}
            />
          ))}
          {preview.moves.map((move) => (
            <Change
              key={`move-${move.name}`}
              label={move.name}
              current={move.current}
              next={move.next}
              delta={move.delta}
            />
          ))}
        </dl>
        {(preview.removed.length > 0 || preview.added.length > 0) && (
          <div className="flex flex-col gap-1 text-body">
            {preview.removed.length > 0 && (
              <p>
                <span className="font-medium">
                  Retirés avec l’ancien GPX :{" "}
                </span>
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
        <p className="text-label text-secondary-foreground">
          Rien ne change tant que tu n’as pas choisi « Remplacer ».
        </p>
        <div className="flex gap-2 sm:justify-end">
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
        </div>
      </div>
    </Widget>
  );
}
