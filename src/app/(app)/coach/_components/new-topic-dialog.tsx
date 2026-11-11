"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AttachmentOption } from "@/features/coach/attachments";
import { topicThemes, topicTitleSchema } from "@/features/coach/topics";

export type DraftTopic = {
  title: string;
  raceId: string | null;
  raceTitle: string | null;
};

const chip =
  "h-auto min-h-control-touch rounded-full px-3 font-normal text-foreground md:min-h-control";

export function NewTopicDialog({
  open,
  onOpenChange,
  races,
  onOpenTopic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  races: readonly AttachmentOption[];
  onOpenTopic: (topic: DraftTopic) => void;
}) {
  const [title, setTitle] = useState("");
  const [raceId, setRaceId] = useState("");
  const [invalid, setInvalid] = useState(false);
  const fieldId = useId();
  const errorId = useId();

  function change(next: boolean) {
    if (!next) {
      setTitle("");
      setRaceId("");
      setInvalid(false);
    }
    onOpenChange(next);
  }

  function submit() {
    const parsed = topicTitleSchema.safeParse(title);
    if (!parsed.success) {
      setInvalid(true);
      return;
    }
    const race = races.find((option) => option.id === raceId) ?? null;
    onOpenTopic({
      title: parsed.data,
      raceId: race?.id ?? null,
      raceTitle: race?.title ?? null,
    });
    change(false);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="gap-0 p-0 sm:max-w-120" showCloseButton={false}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-4 p-5">
            <DialogHeader>
              <DialogTitle className="text-body-lg">Nouveau sujet</DialogTitle>
              <DialogDescription className="text-secondary-foreground">
                Un sujet est une conversation à part, pour une question qui
                demande plusieurs échanges. Le staff y garde le fil, et t’en
                fait un résumé quand tu le clos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <label htmlFor={fieldId} className="text-label font-medium">
                De quoi veux-tu parler ?
              </label>
              <Input
                id={fieldId}
                value={title}
                maxLength={120}
                autoComplete="off"
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setInvalid(false);
                }}
              />
              {invalid && (
                <p id={errorId} className="text-label text-destructive">
                  Donne un nom à ce sujet.
                </p>
              )}
              <div
                role="group"
                aria-label="Thèmes"
                className="flex flex-wrap gap-1.5"
              >
                {topicThemes.map((theme) => (
                  <Button
                    key={theme}
                    type="button"
                    variant="outline"
                    className={chip}
                    onClick={() => {
                      setTitle(theme);
                      setInvalid(false);
                    }}
                  >
                    {theme}
                  </Button>
                ))}
              </div>
            </div>
            {races.length > 0 && (
              <div className="flex flex-col gap-2">
                <span id={`${fieldId}-race`} className="text-label font-medium">
                  Lier à
                </span>
                <ToggleGroup
                  type="single"
                  variant="choice"
                  value={raceId}
                  onValueChange={setRaceId}
                  aria-labelledby={`${fieldId}-race`}
                  className="flex flex-wrap justify-start gap-1.5"
                >
                  {races.map((race) => (
                    <ToggleGroupItem
                      key={race.id}
                      value={race.id}
                      className="min-h-control-touch rounded-md px-2.5 md:min-h-control"
                    >
                      Course · {race.title}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
            <p className="text-label text-muted-foreground">
              Pour une question du jour, écris plutôt dans le fil principal :
              pas besoin de sujet.
            </p>
          </div>
          <DialogFooter className="border-t border-border px-5 py-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit">Ouvrir le sujet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
