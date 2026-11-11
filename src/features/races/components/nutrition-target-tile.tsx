"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { actionMessage } from "../messages";
import { saveRacePlan } from "@/server/races/actions";

export type TargetField = {
  key:
    | "carbsPerHourG"
    | "waterMlPerHour"
    | "sodiumMgPerHour"
    | "caffeineMaxMg"
    | "alarmMinutes"
    | "flaskMl"
    | "flaskCount"
    | "bladderMl";
  label: string;
  value: number | null;
  min: number;
  max: number;
  optional?: boolean;
};

export function NutritionTargetTile({
  raceId,
  revision,
  label,
  value,
  detail,
  mobileDetail,
  title,
  fields,
  nightCaffeine,
  className,
}: {
  raceId: string;
  revision: number | null;
  label: string;
  value: string;
  detail: string;
  mobileDetail?: string;
  title: string;
  fields: TargetField[];
  nightCaffeine?: boolean;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const initial = () =>
    Object.fromEntries(
      fields.map((field) => [field.key, field.value?.toString() ?? ""]),
    );
  const [values, setValues] = useState(initial);
  const [night, setNight] = useState(nightCaffeine ?? false);
  const toggle = (next: boolean) => {
    if (next) {
      setValues(initial());
      setNight(nightCaffeine ?? false);
    }
    setOpen(next);
  };
  const [pending, startTransition] = useTransition();
  const parsed = fields.map((field) => {
    const text = values[field.key].trim();
    if (!text && field.optional) return [field.key, null] as const;
    const number = Number(text.replace(",", "."));
    return [
      field.key,
      Number.isInteger(number) && number >= field.min && number <= field.max
        ? number
        : undefined,
    ] as const;
  });
  const valid = parsed.every(([, number]) => number !== undefined);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = await saveRacePlan(raceId, revision, {
        ...Object.fromEntries(parsed),
        ...(nightCaffeine !== undefined && { nightCaffeine: night }),
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status), { id: "race-nutrition" });
        return;
      }
      toast.success("Cibles nutrition enregistrées.", {
        id: "race-nutrition",
      });
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "-mx-2 grid min-w-0 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-stride hover:bg-muted",
            className,
          )}
        >
          <span className="order-2 text-label text-secondary-foreground">
            {label}
          </span>
          <span
            data-slot="metric"
            className="order-1 text-title font-semibold whitespace-nowrap tabular-nums"
          >
            {value}
          </span>
          <span className="order-3 text-label text-muted-foreground">
            <span className={cn(mobileDetail && "max-sm:hidden")}>
              {detail}
            </span>
            {mobileDetail && <span className="sm:hidden">{mobileDetail}</span>}
          </span>
          <span className="sr-only">, modifier</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-76 p-4">
        <form onSubmit={save} className="flex flex-col gap-3.5">
          <p className="text-label font-medium text-muted-foreground">
            {title}
          </p>
          <div className={cn("grid gap-3", fields.length > 1 && "grid-cols-2")}>
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-${field.key}`}>{field.label}</Label>
                <Input
                  id={`${id}-${field.key}`}
                  inputMode="numeric"
                  value={values[field.key]}
                  placeholder={field.optional ? "Aucune" : undefined}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  aria-invalid={
                    parsed.find(([key]) => key === field.key)?.[1] === undefined
                  }
                />
              </div>
            ))}
          </div>
          {nightCaffeine !== undefined && (
            <Label className="flex items-center gap-2.5 text-body">
              <Checkbox
                checked={night}
                onCheckedChange={(checked) => setNight(checked === true)}
              />
              Caféine pendant la nuit
            </Label>
          )}
          {!valid && (
            <p className="text-label text-destructive">
              {fields
                .map(
                  (field) =>
                    `${field.label} : ${field.min} à ${field.max}${field.optional ? " ou vide" : ""}`,
                )
                .join(" · ")}
            </p>
          )}
          <Button
            type="submit"
            className="self-start"
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
