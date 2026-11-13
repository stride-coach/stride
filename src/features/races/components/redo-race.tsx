"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatLongFrenchDate } from "@/features/onboarding/dates";
import { redoRace } from "@/server/races/redo";
import { formatDuration } from "../format";
import { actionMessage } from "../messages";
import { RacePlanEffect } from "./race-plan-effect";

type Priority = "A" | "B" | "C";

const priorityLabels: Record<Priority, string> = {
  A: "A · objectif de la saison",
  B: "B",
  C: "C",
};

function CarryRow({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  detail?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3 border-t border-border py-2.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        {detail && (
          <span className="text-label text-muted-foreground">{detail}</span>
        )}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function RedoRace({
  sourceId,
  defaultDate,
  priority: sourcePriority,
  target,
  has,
  hasPlan,
}: {
  sourceId: string;
  defaultDate: string;
  priority: Priority;
  target: { seconds: number; reason: string } | null;
  has: { course: boolean; nutrition: boolean; gear: boolean; lessons: boolean };
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState<Priority>(sourcePriority);
  const [course, setCourse] = useState(has.course);
  const [nutrition, setNutrition] = useState(has.nutrition);
  const [gear, setGear] = useState(has.gear);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await redoRace({
        sourceId,
        date,
        priority,
        targetSeconds: target?.seconds ?? null,
        course,
        nutrition,
        gear,
      });
      if (result.status !== "saved") {
        toast.error(actionMessage(result.status));
        return;
      }
      if (hasPlan) {
        setCreated({ id: result.id, name: result.name });
        return;
      }
      toast.success(`${result.name} ajoutée à ta saison.`);
      setOpen(false);
      router.push(`/races/${result.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Refaire cette course
        </Button>
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{created.name} ajoutée à ta saison</DialogTitle>
              <DialogDescription>
                Le coach regarde ce que la course change à ton plan.
              </DialogDescription>
            </DialogHeader>
            <RacePlanEffect
              raceId={created.id}
              name={created.name}
              priority={priority}
              dateLabel={formatLongFrenchDate(date)}
            />
            <DialogFooter>
              <Button asChild>
                <Link href={`/races/${created.id}`}>Ouvrir la course</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Refaire cette course</DialogTitle>
              <DialogDescription className="sr-only">
                Ajoute l’édition suivante à ta saison avec ce que tu reprends de
                celle-ci.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              <Label htmlFor="redo-edition">Édition</Label>
              <Label htmlFor="redo-date">Date</Label>
              <Input
                id="redo-edition"
                value={date.slice(0, 4)}
                readOnly
                tabIndex={-1}
                className="tabular-nums"
              />
              <Input
                id="redo-date"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
              <p className="col-span-2 text-label text-muted-foreground">
                Date estimée d’après les éditions passées. À confirmer.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span id="redo-priority" className="text-body font-medium">
                Priorité
              </span>
              <div
                role="group"
                aria-labelledby="redo-priority"
                className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5"
              >
                {(["A", "B", "C"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={priority === item}
                    onClick={() => setPriority(item)}
                    className="inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground md:min-h-7"
                  >
                    {priorityLabels[item]}
                  </button>
                ))}
              </div>
            </div>
            {target && (
              <div className="flex items-start gap-2.5 rounded-lg border border-border px-3.5 py-3">
                <StrideMark className="mt-1 size-3.5 shrink-0" />
                <p className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    Objectif proposé : {formatDuration(target.seconds)}
                  </span>
                  <span className="text-label text-pretty text-secondary-foreground">
                    {target.reason}
                  </span>
                </p>
              </div>
            )}
            <div
              role="group"
              aria-label="Ce que tu reprends"
              className="flex flex-col border-b border-border"
            >
              <CarryRow
                label="Le tracé et les points de passage"
                detail={
                  has.course
                    ? "à vérifier quand l’organisation publiera le nouveau"
                    : "pas de tracé sur cette édition"
                }
                checked={course}
                disabled={!has.course}
                onChange={setCourse}
              />
              <CarryRow
                label="Ton plan de ravitaillement"
                detail={
                  has.nutrition
                    ? "produits, départ et sac d’allègement"
                    : "pas de plan sur cette édition"
                }
                checked={nutrition}
                disabled={!has.nutrition}
                onChange={setNutrition}
              />
              <CarryRow
                label="Ta liste d’équipement"
                detail={
                  has.gear ? "à revérifier" : "pas de liste sur cette édition"
                }
                checked={gear}
                disabled={!has.gear}
                onChange={setGear}
              />
              {has.lessons && (
                <CarryRow
                  label="Ce qu’on garde et ce qu’on change"
                  detail="repris dans la préparation"
                  checked
                  disabled
                />
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || !date}>
                Ajouter à la saison
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
