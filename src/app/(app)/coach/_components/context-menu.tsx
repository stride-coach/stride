"use client";

import { useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  attachmentKinds,
  attachmentMenuLabels,
  attachmentSuggestion,
  optionsOf,
  toggleAttachment,
  type AttachmentKind,
  type AttachmentOption,
  type AttachmentOptions,
} from "@/features/coach/attachments";
import { AttachmentIcon } from "@/features/coach/components/attachment-icon";
import { ContextPicker } from "./context-picker";

function ContextMenu({
  options,
  today,
  controlSize,
  triggerRef,
  onChoose,
}: {
  options: AttachmentOptions;
  today: string;
  controlSize: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onChoose: (kind: AttachmentKind) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          aria-label="Ajouter du contexte : séance, activité, course, donnée de santé ou fichier"
          className={cn(
            controlSize,
            "p-0 text-secondary-foreground md:w-auto md:px-2.5 md:font-medium",
          )}
        >
          <PlusIcon aria-hidden="true" strokeWidth={1.6} />
          <span aria-hidden="true" className="max-md:hidden">
            Contexte
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={6}
        aria-label="Ajouter du contexte"
        className="w-84 max-w-[calc(100vw-1.5rem)] p-1.5"
      >
        <DropdownMenuLabel className="px-2 pt-1 pb-1.5 text-label font-normal text-muted-foreground">
          Ajouter du contexte
        </DropdownMenuLabel>
        {attachmentKinds.map((kind) => (
          <DropdownMenuItem
            key={kind}
            onSelect={() => onChoose(kind)}
            className="min-h-control-touch gap-2.5 md:min-h-8.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-secondary-foreground">
              <AttachmentIcon kind={kind} className="size-3.5" />
            </span>
            <span className="shrink-0 font-medium whitespace-nowrap">
              {attachmentMenuLabels[kind]}
            </span>
            <span className="ml-auto min-w-0 truncate pl-2 text-label text-muted-foreground">
              {attachmentSuggestion(kind, optionsOf(options, kind), today)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContextAdd({
  options,
  selected,
  today,
  controlSize,
  onChange,
}: {
  options: AttachmentOptions;
  selected: readonly AttachmentOption[];
  today: string;
  controlSize: string;
  onChange: (
    update: (current: AttachmentOption[]) => AttachmentOption[],
  ) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AttachmentKind>("session");
  const [uploaded, setUploaded] = useState<AttachmentOption[]>([]);
  const pickerOptions: AttachmentOptions = { ...options, file: uploaded };

  return (
    <>
      <ContextMenu
        options={pickerOptions}
        today={today}
        controlSize={controlSize}
        triggerRef={trigger}
        onChoose={(kind) => {
          setTab(kind);
          setOpen(true);
        }}
      />
      <ContextPicker
        open={open}
        onOpenChange={setOpen}
        options={pickerOptions}
        selected={selected}
        today={today}
        tab={tab}
        onTabChange={setTab}
        returnFocus={trigger}
        onToggle={(option) =>
          onChange((current) => toggleAttachment(current, option))
        }
        onUploaded={(option) => {
          setUploaded((current) => [option, ...current]);
          onChange((current) => toggleAttachment(current, option));
        }}
      />
    </>
  );
}
