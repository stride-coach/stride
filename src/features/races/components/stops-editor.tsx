"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MonoLabel } from "@/components/stride/mono-label";
import { actionMessage } from "../messages";
import { saveRacePlan } from "@/server/races/actions";

function minutesOf(value: string) {
  const minutes = Number(value.replace(",", "."));
  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 60
    ? minutes * 60
    : null;
}

export function StopsEditor({
  raceId,
  revision,
  aidStopSeconds,
  waterStopSeconds,
  children,
}: {
  raceId: string;
  revision: number | null;
  aidStopSeconds: number;
  waterStopSeconds: number;
  children: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [aid, setAid] = useState(String(Math.round(aidStopSeconds / 60)));
  const [water, setWater] = useState(String(Math.round(waterStopSeconds / 60)));
  const [pending, startTransition] = useTransition();
  const aidSeconds = minutesOf(aid);
  const waterSeconds = minutesOf(water);
  const valid = aidSeconds !== null && waterSeconds !== null;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = await saveRacePlan(raceId, revision, {
        aidStopSeconds: aidSeconds,
        waterStopSeconds: waterSeconds,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status), { id: "race-stops" });
        return;
      }
      toast.success("Durées d’arrêt enregistrées.", { id: "race-stops" });
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-sm text-left decoration-dim underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {children}
          <span className="sr-only">, modifier les durées d’arrêt</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-72 p-4">
        <form onSubmit={save} className="flex flex-col gap-3.5">
          <MonoLabel size="micro">Durées d’arrêt</MonoLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-aid`}>Ravito (min)</Label>
              <Input
                id={`${id}-aid`}
                inputMode="numeric"
                value={aid}
                onChange={(event) => setAid(event.target.value)}
                aria-invalid={aidSeconds === null}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-water`}>Point d’eau (min)</Label>
              <Input
                id={`${id}-water`}
                inputMode="numeric"
                value={water}
                onChange={(event) => setWater(event.target.value)}
                aria-invalid={waterSeconds === null}
              />
            </div>
          </div>
          {!valid && (
            <p className="text-xs text-destructive">
              Indique un nombre entier de minutes, entre 0 et 60.
            </p>
          )}
          <Button
            type="submit"
            size="md"
            className="self-start rounded-lg text-meta"
            disabled={!valid || pending}
            aria-busy={pending}
          >
            Enregistrer
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
