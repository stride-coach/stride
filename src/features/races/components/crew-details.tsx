"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { saveCrewDetails } from "@/server/races/actions";
import { actionMessage } from "../messages";

export function CrewDetailsButton({
  raceId,
  waypointId,
  name,
  mode,
  access,
  prepare,
  reason,
}: {
  raceId: string;
  waypointId: string;
  name: string;
  mode: "crew" | "gap";
  access: string | null;
  prepare: string | null;
  reason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    access: access ?? "",
    prepare: prepare ?? "",
    reason: reason ?? "",
  });
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveCrewDetails(raceId, waypointId, {
        access: mode === "crew" ? values.access : access,
        prepare: mode === "crew" ? values.prepare : prepare,
        reason: mode === "gap" ? values.reason : reason,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      toast.success("Assistance mise à jour.");
      setOpen(false);
    });
  }

  const field = (
    key: "access" | "prepare" | "reason",
    label: string,
    placeholder: string,
    max: number,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-label text-secondary-foreground">{label}</span>
      <Input
        value={values[key]}
        maxLength={max}
        placeholder={placeholder}
        onChange={(event) =>
          setValues((current) => ({ ...current, [key]: event.target.value }))
        }
        className="h-control-touch rounded-lg bg-card md:h-control"
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Modifier l’assistance à ${name}`}
        >
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {mode === "crew"
                ? "Ce que ton assistance doit savoir pour te retrouver ici."
                : "Pourquoi ton assistance ne peut pas venir ici."}
            </DialogDescription>
          </DialogHeader>
          {mode === "crew" ? (
            <>
              {field(
                "access",
                "Accès",
                "Parking du gymnase, 5 min à pied",
                120,
              )}
              {field("prepare", "À préparer", "2 flasques iso, 4 gels", 200)}
            </>
          ) : (
            field(
              "reason",
              "Raison",
              "Assistance interdite par le règlement",
              120,
            )
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
