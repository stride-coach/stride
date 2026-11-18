"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  clearAllLine,
  factActionMessage,
  factCategories,
  factCategoryChoices,
  factStatus,
  factTextLimit,
  type Fact,
  type FactCategory,
} from "@/features/coach/memory";
import {
  addFact,
  clearFacts,
  confirmFact,
  correctFact,
  forgetFact,
  type FactActionResult,
} from "@/server/coaching/memory-actions";

function FactForm({ fact, onDone }: { fact: Fact | null; onDone: () => void }) {
  const fieldId = useId();
  const [text, setText] = useState(fact?.text ?? "");
  const [category, setCategory] = useState<FactCategory>(
    fact?.category ?? "habit",
  );
  const [startsOn, setStartsOn] = useState(fact?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(fact?.endsOn ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const upcoming = category === "upcoming";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const fields = {
      category,
      text,
      startsOn: upcoming && startsOn ? startsOn : null,
      endsOn: upcoming && endsOn ? endsOn : null,
    };
    startTransition(async () => {
      const result: FactActionResult = await (
        fact ? correctFact({ id: fact.id, ...fields }) : addFact(fields)
      ).catch((): FactActionResult => ({ ok: false, reason: "failed" }));
      if (!result.ok) {
        setMessage(factActionMessage(result.reason));
        return;
      }
      toast.success(
        fact
          ? "Information corrigée."
          : "Information ajoutée. Le staff s’en sert dès sa prochaine réponse.",
        { id: "coach-memory" },
      );
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogTitle>
        {fact ? "Corriger l’information" : "Ajouter une information"}
      </DialogTitle>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${fieldId}-text`} className="font-medium">
          Ce que le staff doit savoir
        </label>
        <Textarea
          id={`${fieldId}-text`}
          value={text}
          maxLength={factTextLimit}
          rows={3}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={`${fieldId}-category`} className="font-medium">
          Catégorie
        </span>
        <ToggleGroup
          type="single"
          variant="choice"
          value={category}
          onValueChange={(value) => {
            if (value) setCategory(value as FactCategory);
          }}
          aria-labelledby={`${fieldId}-category`}
          className="flex flex-wrap justify-start gap-1.5"
        >
          {factCategories.map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="min-h-control-touch rounded-md px-2.5 md:min-h-control"
            >
              {factCategoryChoices[item]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {upcoming && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${fieldId}-from`} className="font-medium">
              Du
            </label>
            <Input
              id={`${fieldId}-from`}
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${fieldId}-to`} className="font-medium">
              Au
            </label>
            <Input
              id={`${fieldId}-to`}
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              onChange={(event) => setEndsOn(event.target.value)}
            />
          </div>
        </div>
      )}
      <DialogDescription>
        Le staff s’en sert dès sa prochaine réponse. Si ça touche ton plan, il
        te fait une proposition : rien n’est modifié sans ton accord.
      </DialogDescription>
      {message && (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending || !text.trim()}>
          {fact ? "Enregistrer" : "Ajouter"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FactDialog({
  fact,
  open,
  onOpenChange,
}: {
  fact: Fact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FactForm fact={fact} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function AddFactButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        Ajouter une information
      </Button>
      <FactDialog fact={null} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function FactRowActions({ fact }: { fact: Fact }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function forget() {
    startTransition(async () => {
      const result: FactActionResult = await forgetFact({ id: fact.id }).catch(
        (): FactActionResult => ({ ok: false, reason: "failed" }),
      );
      if (result.ok)
        toast.success("Information oubliée. Le staff ne l’utilise plus.", {
          id: "coach-memory",
        });
      else
        toast.error(factActionMessage(result.reason), { id: "coach-memory" });
    });
  }

  function confirm() {
    startTransition(async () => {
      const result: FactActionResult = await confirmFact({ id: fact.id }).catch(
        (): FactActionResult => ({ ok: false, reason: "failed" }),
      );
      if (result.ok)
        toast.success("Information confirmée. Le staff peut s’y fier.", {
          id: "coach-memory",
        });
      else
        toast.error(factActionMessage(result.reason), { id: "coach-memory" });
    });
  }

  return (
    <>
      <span className="flex items-center gap-1">
        {factStatus(fact) === "observed" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-secondary-foreground"
            aria-label={`Confirmer : ${fact.text}`}
            disabled={pending}
            onClick={confirm}
          >
            Confirmer
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-secondary-foreground"
          aria-label={`Corriger : ${fact.text}`}
          onClick={() => setEditing(true)}
        >
          Corriger
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-secondary-foreground"
          aria-label={`Oublier : ${fact.text}`}
          disabled={pending}
          onClick={forget}
        >
          Oublier
        </Button>
      </span>
      <FactDialog fact={fact} open={editing} onOpenChange={setEditing} />
    </>
  );
}

export function ClearAllButton({
  said,
  observed,
  categories,
}: {
  said: number;
  observed: number;
  categories: readonly FactCategory[];
}) {
  const count = said + observed;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      const result: FactActionResult = await clearFacts().catch(
        (): FactActionResult => ({ ok: false, reason: "failed" }),
      );
      if (result.ok) {
        setOpen(false);
        toast.success("Le staff a tout oublié.", { id: "coach-memory" });
      } else
        toast.error(factActionMessage(result.reason), { id: "coach-memory" });
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-destructive"
        disabled={count === 0}
        onClick={() => setOpen(true)}
      >
        Tout effacer
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Tout effacer ?</AlertDialogTitle>
          <AlertDialogDescription>
            {clearAllLine(count, categories)} Tes activités, ton plan et tes
            conversations ne sont pas touchés.
          </AlertDialogDescription>
          {[
            { label: "Ce que tu lui as dit", value: said },
            { label: "Ce qu’il a observé", value: observed },
          ]
            .filter((line) => line.value > 0)
            .map((line) => (
              <p
                key={line.label}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
              >
                <span className="text-secondary-foreground">{line.label}</span>
                <span className="font-medium tabular-nums">{line.value}</span>
              </p>
            ))}
          <p className="text-secondary-foreground">
            Il repartira de tes données, et te reposera sans doute quelques
            questions. Cette action ne s’annule pas.
          </p>
          <AlertDialogFooter>
            <Button asChild variant="ghost" className="sm:mr-auto">
              <a href="/api/coach/memory/export" download>
                Exporter d’abord
              </a>
            </Button>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              className="border-destructive text-destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                clear();
              }}
            >
              Tout effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
