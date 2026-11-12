"use client";

import { useRef, useState, useTransition } from "react";
import { FlagIcon } from "lucide-react";
import { toast } from "sonner";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showImportedRace } from "@/server/races/actions";
import { importMessage } from "../messages";
import { uploadTo } from "./course-import";

export function CourseDropZone({ raceId }: { raceId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function send(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error(importMessage("too-large"));
      return;
    }
    const body = new FormData();
    body.set("file", file);
    startTransition(async () => {
      const result = await uploadTo(`/api/races/${raceId}/course`, body);
      if (result.status === "saved") {
        toast.success("Parcours importé.");
        await showImportedRace(raceId, "root");
      } else toast.error(importMessage(result.status));
    });
  }

  return (
    <section
      aria-labelledby="course-drop"
      aria-busy={pending || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        send(event.dataTransfer.files[0]);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-dashed border-control-border px-4 py-3.5 transition-colors sm:flex-row sm:items-center",
        dragging && "border-primary bg-muted",
      )}
    >
      <FlagIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-secondary-foreground max-sm:hidden"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="course-drop" className="font-medium">
          Dépose le tracé GPX de la course
        </h2>
        <p className="text-body text-secondary-foreground">
          Stride y lit le profil, les côtes à marcher, les ravitaillements et
          les barrières horaires, puis place la météo sur le parcours.
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => send(event.target.files?.[0])}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? "Import en cours…" : "Choisir un fichier"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/races/${raceId}/course`}>
            Autres façons de l’ajouter
          </Link>
        </Button>
      </div>
    </section>
  );
}
