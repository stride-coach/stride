"use client";

import {
  createContext,
  use,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import { BanIcon, GripVerticalIcon } from "lucide-react";
import {
  WeekDayCards,
  type WeekCardDay,
  type WeekCardDrop,
  type WeekCardItemProps,
} from "@/components/stride/week-day-cards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  reportDecision,
  type DecisionFailures,
  type MoveMessages,
} from "@/features/today/components/report-decision";
import { cn } from "@/lib/utils";
import {
  moveBlockText,
  type MoveBlock,
} from "@/features/plans/schedule/move-check";
import {
  moveDayLabel,
  type MoveDay,
} from "@/features/plans/schedule/week-moves";
import {
  moveSession,
  readMoveTargets,
  type ProposalActionResult,
} from "@/server/plans/actions";
import type { MoveTarget } from "@/server/plans/move-targets";

type MoveDays = Record<string, MoveDay[]>;

type Dragged = {
  sessionKey: string;
  title: string;
  date: string;
  preview: ReactNode;
};

type WeekMove = {
  moveDays: MoveDays;
  targets: Record<string, MoveTarget[]>;
  active: Dragged | null;
  over: string | null;
  moving: { sessionKey: string; date: string } | null;
  load: (sessionKey: string) => void;
  move: (sessionKey: string, from: string, day: MoveDay) => void;
};

const WeekMoveContext = createContext<WeekMove | null>(null);

function useWeekMove() {
  const move = use(WeekMoveContext);
  if (!move) throw new Error("WeekMoveProvider is missing");
  return move;
}

const failures: DecisionFailures = {
  error: "Le déplacement n’a pas pu être enregistré. Réessaie dans un instant.",
  pending:
    "Le déplacement est enregistré, mais le plan n’a pas pu être mis à jour. Recharge la page pour réessayer.",
  "session-expired":
    "Ta session a expiré. Reconnecte-toi pour déplacer la séance.",
  "invalid-request": "Cette séance ne peut plus être déplacée.",
};

const moveMessages: MoveMessages = {
  blocked:
    "Ce jour-là, la séance ne respecte pas les règles de Stride. Elle reste à sa place.",
  stale:
    "Ton plan a changé entre-temps : la séance reste à sa place. Recharge la page pour voir la version à jour.",
  pending:
    "Le coach propose déjà un ajustement pour cette séance : décide-le d’abord.",
};

class MovePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: ReactPointerEvent, options: PointerSensorOptions) =>
        event.nativeEvent.pointerType !== "touch" &&
        PointerSensor.activators.every((activator) =>
          activator.handler(event, options),
        ),
    },
  ];
}

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
}

function dragged(active: Active): Dragged | null {
  return (active.data.current as Dragged | undefined) ?? null;
}

function titleOf(active: Active) {
  return dragged(active)?.title ?? "la séance";
}

const announcements: Announcements = {
  onDragStart: ({ active }) =>
    `Séance « ${titleOf(active)} » saisie. Dépose-la sur un autre jour de la semaine.`,
  onDragOver: ({ active, over }) =>
    over
      ? `« ${titleOf(active)} » au-dessus de ${moveDayLabel(String(over.id))}.`
      : `« ${titleOf(active)} » n’est au-dessus d’aucun jour disponible.`,
  onDragEnd: ({ active, over }) =>
    over && over.id !== dragged(active)?.date
      ? `« ${titleOf(active)} » déposée sur ${moveDayLabel(String(over.id))}.`
      : `« ${titleOf(active)} » reste à sa place.`,
  onDragCancel: ({ active }) =>
    `Déplacement annulé. « ${titleOf(active)} » reste à sa place.`,
};

const screenReaderInstructions = {
  draggable:
    "Active ce bouton pour choisir un autre jour de la semaine, ou fais-le glisser sur un jour.",
};

export function WeekMoveProvider({
  moveDays,
  children,
}: {
  moveDays: MoveDays;
  children: ReactNode;
}) {
  const [cache, setCache] = useState({
    source: moveDays,
    targets: {} as Record<string, MoveTarget[]>,
  });
  const loading = useRef({ source: moveDays, keys: new Set<string>() });
  if (cache.source !== moveDays) setCache({ source: moveDays, targets: {} });
  const [active, setActive] = useState<Dragged | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [moving, setMoving] = useState<WeekMove["moving"]>(null);
  const [pending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(MovePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );
  const targets = cache.source === moveDays ? cache.targets : {};

  const load = (sessionKey: string) => {
    if (loading.current.source !== moveDays)
      loading.current = { source: moveDays, keys: new Set() };
    const { keys } = loading.current;
    if (targets[sessionKey] || keys.has(sessionKey)) return;
    const source = moveDays;
    keys.add(sessionKey);
    readMoveTargets({ sessionKey })
      .then((result) => {
        if (result.status !== "ok") return;
        setCache((current) =>
          current.source === source
            ? {
                source,
                targets: { ...current.targets, [sessionKey]: result.targets },
              }
            : current,
        );
      })
      .catch(() => undefined)
      .finally(() => keys.delete(sessionKey));
  };

  const move = (sessionKey: string, from: string, day: MoveDay) => {
    setMoving({ sessionKey, date: from });
    startTransition(async () => {
      const result = await moveSession({ sessionKey, toDate: day.date }).catch(
        (): ProposalActionResult => ({ status: "error" }),
      );
      reportDecision(result, {
        id: "plan-move",
        success: `Séance déplacée : ${day.label}.`,
        failures,
        move: moveMessages,
      });
    });
  };

  const reset = () => {
    setActive(null);
    setOver(null);
  };

  const onDragStart = ({ active: item }: DragStartEvent) => {
    setActive(dragged(item));
    setOver(null);
  };

  const onDragOver = ({ over: target }: DragOverEvent) =>
    setOver(target ? String(target.id) : null);

  const onDragEnd = ({ active: item, over: target }: DragEndEvent) => {
    const source = dragged(item);
    reset();
    if (!source || !target || target.id === source.date) return;
    const day = moveDays[source.sessionKey]?.find(
      (option) => option.date === target.id,
    );
    if (day) move(source.sessionKey, source.date, day);
  };

  return (
    <WeekMoveContext
      value={{
        moveDays,
        targets,
        active,
        over,
        moving: pending ? moving : null,
        load,
        move,
      }}
    >
      <DndContext
        id="week-move"
        sensors={sensors}
        collisionDetection={pointerWithin}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={reset}
      >
        {children}
        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {active && (
            <div className="relative">
              <div className="absolute -top-0.75 -right-0.75 w-34 md:-top-2 md:-right-2">
                {active.preview}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </WeekMoveContext>
  );
}

function holds(day: MoveDay) {
  if (day.sessions.length > 0) return day.sessions.join(", ");
  return day.restKey ? "Repos" : "Libre";
}

function options(move: WeekMove, sessionKey: string): MoveTarget[] {
  return (
    move.targets[sessionKey] ??
    (move.moveDays[sessionKey] ?? []).map((day) => ({ ...day, block: null }))
  );
}

function BlockReason({ block }: { block: MoveBlock }) {
  return (
    <span className="flex items-start gap-1.5 text-label text-secondary-foreground">
      <BanIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      {moveBlockText[block]}
    </span>
  );
}

function OptionText({ option }: { option: MoveTarget }) {
  return (
    <>
      <span className="font-medium first-letter:uppercase">{option.label}</span>
      <span
        className={cn(
          "max-w-full truncate text-label",
          !option.block && "text-muted-foreground",
        )}
      >
        {holds(option)}
      </span>
      {option.block && <BlockReason block={option.block} />}
    </>
  );
}

export function MoveHandle({
  sessionKey,
  title,
  date,
  preview,
  inline = false,
}: {
  sessionKey: string;
  title: string;
  date: string;
  preview: ReactNode;
  inline?: boolean;
}) {
  const move = useWeekMove();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const wasOpen = useRef(false);
  const busy = move.moving !== null;
  const handle = useRef<HTMLButtonElement | null>(null);
  const { attributes, setNodeRef, listeners, isDragging } = useDraggable({
    id: sessionKey,
    data: { sessionKey, title, date, preview } satisfies Dragged,
    disabled: busy,
  });
  const change = (next: boolean) => {
    if (next) move.load(sessionKey);
    setOpen(next);
  };
  const choose = (option: MoveTarget) => {
    setOpen(false);
    move.move(sessionKey, date, option);
  };
  const items = options(move, sessionKey);
  const subtitle = `${title} · ${moveDayLabel(date)}`;
  const button = (
    <button
      ref={(node) => {
        handle.current = node;
        setNodeRef(node);
      }}
      type="button"
      aria-label={`Déplacer « ${title} »`}
      aria-describedby={attributes["aria-describedby"]}
      aria-haspopup={mobile ? "dialog" : "menu"}
      aria-expanded={open}
      disabled={busy}
      onFocus={() => move.load(sessionKey)}
      onPointerDown={(event) => {
        wasOpen.current = open;
        move.load(sessionKey);
        listeners?.onPointerDown?.(event);
        event.preventDefault();
      }}
      onTouchStart={(event) => listeners?.onTouchStart?.(event)}
      onClick={() => {
        if (!wasOpen.current) change(true);
        wasOpen.current = false;
      }}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-stride select-none [-webkit-touch-callout:none] hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-50 aria-expanded:bg-muted aria-expanded:text-foreground md:size-5.5",
        isDragging && "cursor-grabbing bg-muted text-foreground",
        inline && "-mt-0.75 -mr-1",
      )}
    >
      <GripVerticalIcon aria-hidden="true" className="size-4 md:size-3.5" />
    </button>
  );
  if (mobile)
    return (
      <>
        {button}
        <Sheet open={open} onOpenChange={change}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              handle.current?.focus();
            }}
            className="gap-0.5 px-2 pt-2 pb-5"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-2 h-1 w-9 rounded-full bg-control-border"
            />
            <SheetHeader className="px-2.5 pt-1 pb-2">
              <SheetTitle>Déplacer vers…</SheetTitle>
              <SheetDescription className="text-label">
                {subtitle}
              </SheetDescription>
            </SheetHeader>
            {items.map((option) => (
              <button
                key={option.date}
                type="button"
                disabled={option.block !== null}
                onClick={() => choose(option)}
                className="flex min-h-14 w-full flex-col items-start justify-center gap-px rounded-md px-2.5 py-1.5 text-left transition-colors duration-150 ease-stride hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
              >
                <OptionText option={option} />
              </button>
            ))}
          </SheetContent>
        </Sheet>
      </>
    );
  return (
    <DropdownMenu open={open} onOpenChange={change}>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-68 p-1.5">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 pt-2 pb-1.5">
          <span className="text-body font-semibold text-foreground">
            Déplacer vers…
          </span>
          <span>{subtitle}</span>
        </DropdownMenuLabel>
        {items.map((option) => (
          <DropdownMenuItem
            key={option.date}
            disabled={option.block !== null}
            onSelect={() => choose(option)}
            className="min-h-11 flex-col items-start justify-center gap-px px-2.5 data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:opacity-100"
          >
            <OptionText option={option} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function dropOf(
  move: WeekMove,
  date: string,
): { drop?: WeekCardDrop; block?: MoveBlock } {
  const { active } = move;
  if (!active) return {};
  if (date === active.date) return { drop: "source" };
  if (!move.moveDays[active.sessionKey]?.some((day) => day.date === date))
    return {};
  const loaded = move.targets[active.sessionKey];
  if (loaded) {
    const target = loaded.find((item) => item.date === date);
    if (!target) return {};
    if (target.block) return { drop: "blocked", block: target.block };
  }
  return { drop: move.over === date ? "over" : "target" };
}

export function DropDay({ date, ...props }: WeekCardItemProps) {
  const move = useWeekMove();
  const { drop } = dropOf(move, date);
  const { setNodeRef } = useDroppable({
    id: date,
    disabled: drop !== "target" && drop !== "over",
  });
  return <li ref={setNodeRef} {...props} />;
}

function MoveHint({ title }: { title: string }) {
  return (
    <p
      aria-hidden="true"
      className="flex items-start gap-2 text-label text-secondary-foreground md:items-center"
    >
      <GripVerticalIcon className="mt-px size-3.5 shrink-0 text-primary md:mt-0" />
      <span>
        Dépose « {title} » sur un autre jour de la semaine.
        <span className="max-md:hidden"> Échap pour annuler.</span>
      </span>
    </p>
  );
}

export function WeekMoveCards({
  days,
  ...props
}: Omit<React.ComponentProps<typeof WeekDayCards>, "item">) {
  const move = useWeekMove();
  return (
    <>
      {move.active && <MoveHint title={move.active.title} />}
      <WeekDayCards
        {...props}
        item={DropDay}
        days={days.map((day): WeekCardDay => {
          const { drop, block } = dropOf(move, day.date);
          return {
            ...day,
            drop,
            pending: move.moving?.date === day.date,
            note:
              drop === "over" ? (
                <span className="font-medium text-primary">Déposer ici</span>
              ) : block ? (
                <BlockReason block={block} />
              ) : undefined,
          };
        })}
      />
    </>
  );
}
