"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  type ChecklistItem,
  type ChecklistList,
  type ChipStatus,
  type ItemStatus,
  chipLabels,
  chipStatuses,
  checklistTemplateFor,
  isPrepList,
  itemChip,
  listTitles,
} from "@/features/races/checklists";
import {
  addChecklistItem,
  applyChecklistTemplate,
  deleteChecklistItem,
  saveDropBagExtras,
  updateChecklistItem,
} from "@/server/races/actions";
import { cn } from "@/lib/utils";

type RacePair = { id: string; name: string; line: string };

const errors = {
  invalid: "Vérifie les informations saisies.",
  conflict: "Cette liste a déjà été modifiée. Recharge la page.",
  missing: "Cet élément n’existe plus.",
  error: "L’enregistrement a échoué. Réessaie.",
  "session-expired": "Ta session a expiré. Reconnecte-toi.",
  "no-track": "Le parcours est indisponible.",
} as const;

const chipTones: Record<ChipStatus, string> = {
  ready: "text-primary",
  check: "text-warning",
  buy: "text-destructive",
  test: "text-data-2",
  todo: "text-muted-foreground",
  weather: "text-data-2",
};

export function GroupCard({
  title,
  aside,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-border bg-muted px-1 pb-1 print:break-inside-avoid print:border-0 print:bg-transparent print:p-0",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-row items-center gap-3 px-2.5 py-1.5">
        <h2 className="min-w-0 font-medium text-secondary-foreground">
          {title}
        </h2>
        {aside && (
          <div className="ml-auto text-label text-muted-foreground">
            {aside}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col rounded-lg border border-border bg-card px-4 py-1.5 print:border-0 print:p-0">
        {children}
      </div>
    </section>
  );
}

function StatusChip({
  item,
  name,
  disabled,
  onStatus,
  onDelete,
}: {
  item: ChecklistItem;
  name: string;
  disabled: boolean;
  onStatus: (status: ChipStatus) => void;
  onDelete: () => void;
}) {
  const chip = itemChip(item);
  const options: ChipStatus[] = isPrepList(item.list)
    ? ["todo", ...chipStatuses]
    : [...chipStatuses, "weather"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Statut de ${name} : ${chipLabels[chip]}`}
        className={cn(
          "inline-flex min-h-control-touch items-center gap-1.5 rounded-md px-1.5 text-label font-medium whitespace-nowrap hover:bg-muted disabled:opacity-70 md:min-h-6",
          chipTones[chip],
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        {chipLabels[chip]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-44">
        <DropdownMenuRadioGroup
          value={chip}
          onValueChange={(value) => {
            const next = options.find((option) => option === value);
            if (next && next !== chip) onStatus(next);
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {chipLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2Icon aria-hidden="true" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddForm({
  label,
  pending,
  maxLength = 120,
  withDetail = true,
  onAdd,
}: {
  label: string;
  pending: boolean;
  maxLength?: number;
  withDetail?: boolean;
  onAdd: (value: string, detail: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [detail, setDetail] = useState("");
  if (!open)
    return (
      <button
        type="button"
        aria-label={`Ajouter un élément à ${label}`}
        onClick={() => setOpen(true)}
        className="flex min-h-control-touch items-center gap-1.5 self-start rounded-md text-body text-muted-foreground hover:text-foreground md:min-h-row print:hidden"
      >
        <PlusIcon aria-hidden="true" className="size-3.5" />
        Ajouter
      </button>
    );
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onAdd(value.trim(), detail.trim() || null)) {
          setValue("");
          setDetail("");
        }
      }}
      className="flex flex-col gap-2 border-t border-border py-2.5 print:hidden"
    >
      <div className="flex gap-2">
        <Input
          autoFocus
          aria-label={`Nouvel élément · ${label}`}
          placeholder="Ajouter un élément"
          value={value}
          maxLength={maxLength}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="min-w-0"
        />
        <Button
          type="submit"
          variant="outline"
          size="icon"
          aria-label={`Ajouter à ${label}`}
          disabled={pending || !value.trim()}
        >
          <PlusIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fermer"
          onClick={() => setOpen(false)}
        >
          <XIcon />
        </Button>
      </div>
      {withDetail && value && (
        <Input
          aria-label="Précision"
          placeholder="Précision facultative"
          value={detail}
          maxLength={240}
          disabled={pending}
          onChange={(event) => setDetail(event.target.value)}
        />
      )}
    </form>
  );
}

export function ChecklistGroup({
  raceId,
  raceKind,
  list,
  initial,
  pairs = [],
  title = listTitles[list],
  aside,
  lead,
  empty = "Aucun élément pour le moment.",
}: {
  raceId: string;
  raceKind: "road" | "trail";
  list: ChecklistList;
  initial: ChecklistItem[];
  pairs?: RacePair[];
  title?: React.ReactNode;
  aside?: React.ReactNode;
  lead?: React.ReactNode;
  empty?: string | null;
}) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const label = listTitles[list];
  const hasTemplate = Boolean(checklistTemplateFor(raceKind, list));
  const linked = (item: ChecklistItem) =>
    item.shoeId
      ? (pairs.find((pair) => pair.id === item.shoeId) ?? null)
      : null;

  function update(
    item: ChecklistItem,
    values: Partial<Pick<ChecklistItem, "checked" | "status" | "shoeId">>,
    success?: string,
  ) {
    const before = items;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, ...values } : entry,
      ),
    );
    start(async () => {
      const result = await updateChecklistItem(raceId, item.id, values);
      if (result.status !== "saved") {
        setItems(before);
        toast.error(errors[result.status], { id: "checklist-update" });
      } else if (success) toast.success(success, { id: "checklist-update" });
    });
  }

  function toggle(item: ChecklistItem, checked: boolean) {
    const status: ItemStatus | null = checked
      ? "ready"
      : isPrepList(list)
        ? null
        : "check";
    update(item, { checked, status });
  }

  function changeStatus(item: ChecklistItem, chip: ChipStatus) {
    update(
      item,
      { checked: chip === "ready", status: chip === "todo" ? null : chip },
      `Statut : ${chipLabels[chip]}.`,
    );
  }

  function add(value: string, detail: string | null) {
    return new Promise<boolean>((resolve) => {
      if (!value) return resolve(false);
      start(async () => {
        const result = await addChecklistItem(raceId, list, {
          label: value,
          detail,
          status: null,
          startDate: null,
          endDate: null,
        });
        if (result.status === "saved") toast.success("Élément ajouté.");
        else toast.error(errors[result.status]);
        resolve(result.status === "saved");
      });
    });
  }

  function applyTemplate() {
    start(async () => {
      const result = await applyChecklistTemplate(raceId, list);
      if (result.status === "saved") toast.success("Liste type ajoutée.");
      else toast.error(errors[result.status]);
    });
  }

  function remove(item: ChecklistItem) {
    const before = items;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    start(async () => {
      const result = await deleteChecklistItem(raceId, item.id);
      if (result.status !== "saved") {
        setItems(before);
        toast.error(errors[result.status]);
      } else toast.success("Élément supprimé.");
    });
  }

  return (
    <GroupCard
      title={title}
      aside={
        (aside || (list !== "gear_forbidden" && items.length > 0)) && (
          <span className="flex items-center gap-3">
            {aside}
            {list !== "gear_forbidden" && items.length > 0 && (
              <span className="tabular-nums">
                {items.filter((item) => itemChip(item) === "ready").length} /{" "}
                {items.length}
              </span>
            )}
          </span>
        )
      }
      aria-label={label}
    >
      {lead}
      {items.length === 0 && hasTemplate && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={applyTemplate}
          className="my-2 self-start print:hidden"
        >
          Utiliser la liste type
        </Button>
      )}
      {items.length === 0 && !hasTemplate && empty && (
        <p className="py-2.5 text-body text-muted-foreground">{empty}</p>
      )}
      {items.map((item) => {
        if (list === "gear_forbidden")
          return (
            <div
              key={item.id}
              className="flex min-h-row items-center gap-2.5 border-b border-border py-1"
            >
              <span aria-hidden="true" className="text-destructive">
                ✕
              </span>
              <span className="min-w-0 flex-1">
                {item.label}
                {item.detail && (
                  <span className="block text-label text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Supprimer ${item.label}`}
                disabled={pending}
                onClick={() => remove(item)}
                className="grid size-control-auto place-items-center rounded-md text-muted-foreground hover:text-destructive print:hidden"
              >
                <Trash2Icon aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          );
        const pair = linked(item);
        const name = item.label;
        const detail = [pair?.line, item.detail].filter(Boolean).join(". ");
        return (
          <div
            key={item.id}
            className="grid min-h-row grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-1.5"
          >
            <Checkbox
              aria-label={name}
              checked={item.checked}
              disabled={pending}
              onCheckedChange={(value) => toggle(item, value === true)}
              className="size-4"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={cn(!item.checked && "font-medium")}>{name}</span>
              {detail && (
                <span className="text-label text-muted-foreground">
                  {detail}
                </span>
              )}
              {list === "gear_kit" && pairs.length > 0 && (
                <select
                  aria-label={`Paire pour ${item.label}`}
                  value={item.shoeId ?? ""}
                  disabled={pending}
                  onChange={(event) =>
                    update(
                      item,
                      { shoeId: event.target.value || null },
                      event.target.value
                        ? "Paire liée."
                        : "Paire retirée de la ligne.",
                    )
                  }
                  className="mt-1 h-control-auto max-w-full self-start rounded-lg border border-input bg-card px-2 text-label text-secondary-foreground print:hidden"
                >
                  <option value="">Aucune paire liée</option>
                  {pairs.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <StatusChip
              item={item}
              name={name}
              disabled={pending}
              onStatus={(chip) => changeStatus(item, chip)}
              onDelete={() => remove(item)}
            />
          </div>
        );
      })}
      <AddForm label={label} pending={pending} onAdd={add} />
    </GroupCard>
  );
}

export function DropBagCard({
  raceId,
  km,
  nutrition,
  extras: initial,
  revision,
}: {
  raceId: string;
  km: string;
  nutrition: string | null;
  extras: string[] | null;
  revision: number | null;
}) {
  const editable = initial !== null;
  const [extras, setExtras] = useState(initial ?? []);
  const [pending, start] = useTransition();

  function save(next: string[], success: string) {
    const before = extras;
    setExtras(next);
    return new Promise<boolean>((resolve) => {
      start(async () => {
        const result = await saveDropBagExtras(raceId, revision, next);
        if (result.status === "saved") toast.success(success);
        else {
          setExtras(before);
          toast.error(errors[result.status]);
        }
        resolve(result.status === "saved");
      });
    });
  }

  return (
    <GroupCard
      aria-label="Sac d’allègement"
      title={
        <>
          Sac d’allègement · <span className="max-md:hidden">base de vie </span>
          km {km}
        </>
      }
    >
      {nutrition && (
        <div className="flex min-h-row items-center justify-between gap-2.5 border-b border-border py-1.5">
          <span>{nutrition}</span>
          <span className="shrink-0 text-muted-foreground">
            <span className="max-md:hidden">depuis le </span>plan nutrition
          </span>
        </div>
      )}
      {extras.map((extra, index) => (
        <div
          key={`${extra}-${index}`}
          className="flex min-h-row items-center justify-between gap-2.5 border-b border-border py-1"
        >
          <span>{extra}</span>
          <button
            type="button"
            aria-label={`Retirer ${extra} du sac d’allègement`}
            disabled={pending}
            onClick={() =>
              save(
                extras.filter((_, position) => position !== index),
                "Retiré du sac d’allègement.",
              )
            }
            className="grid size-control-auto shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive print:hidden"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
      {!nutrition && extras.length === 0 && (
        <p className="py-2.5 text-body text-muted-foreground">
          Rien dans le sac pour le moment.
        </p>
      )}
      {editable && extras.length < 20 && (
        <AddForm
          label="Sac d’allègement"
          pending={pending}
          maxLength={80}
          withDetail={false}
          onAdd={(value) =>
            value
              ? save([...extras, value], "Ajouté au sac d’allègement.")
              : Promise.resolve(false)
          }
        />
      )}
    </GroupCard>
  );
}
