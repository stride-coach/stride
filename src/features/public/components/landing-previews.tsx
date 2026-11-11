import { Chip } from "@/components/stride/chip";
import { Plage } from "@/components/stride/plage";
import type { SessionBlock } from "@/components/stride/session-blocks";
import { SessionStateMark } from "@/components/stride/session-row";
import { SessionShape } from "@/components/stride/session-shape";
import { Status } from "@/components/stride/status";
import { NavProgressIcon } from "@/components/stride/nav-icons";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";

const blocks: SessionBlock[] = [
  { minutes: 15, zone: 2 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1, removed: true },
  { minutes: 6, zone: 4, removed: true },
  { minutes: 10, zone: 2 },
];

const figures = [
  { value: "52 min", unit: "durée" },
  { value: "9,6 km", unit: "distance" },
  { value: "4:38–4:42", unit: "/km" },
  { value: "161–170", unit: "bpm" },
] as const;

const signals = [
  {
    name: "Sommeil",
    range: "7h00–7h45",
    value: "5h52",
    level: "watch",
    verdict: "Sous ta plage",
    scale: { min: 300, max: 540, low: 420, high: 465, value: 352 },
  },
  {
    name: "VFC",
    range: "52–64 ms",
    value: "46 ms",
    level: "watch",
    verdict: "Sous ta plage",
    scale: { min: 36, max: 76, low: 52, high: 64, value: 46 },
  },
  {
    name: "FC repos",
    range: "43–46 bpm",
    value: "47 bpm",
    level: "watch",
    verdict: "Au-dessus",
    scale: { min: 36, max: 52, low: 43, high: 46, value: 47 },
  },
  {
    name: "Charge 7 j",
    range: "0,8–1,3",
    value: "1,24",
    level: "ok",
    verdict: "Dans ta plage",
    scale: { min: 0.4, max: 1.7, low: 0.8, high: 1.3, value: 1.24 },
  },
] as const;

function SessionPreview() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <SessionStateMark state="today" />
        <span className="text-title font-semibold">Seuil 4 × 6’</span>
        <Chip proposal>Proposition</Chip>
        <Chip intensity={4}>Seuil</Chip>
        <Chip className="max-md:hidden">Route · plat</Chip>
        <span className="ml-auto text-label text-muted-foreground max-md:hidden">
          Meilleur créneau : après 17:00
        </span>
      </div>
      <p className="flex items-start gap-2.5 text-secondary-foreground">
        <StaffAvatar agent="coach" size={22} decorative />
        <span>
          Une répétition en moins qu’au plan (5 × 6’) : sommeil et VFC sont sous
          ta plage, tes jambes sont fraîches. L’allure ne change pas.
        </span>
      </p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        {figures.map((figure) => (
          <div key={figure.unit} className="flex items-baseline gap-1">
            <dt className="sr-only">{figure.unit}</dt>
            <dd className="font-semibold tabular-nums">{figure.value}</dd>
            <dd aria-hidden="true" className="text-label text-muted-foreground">
              {figure.unit}
            </dd>
          </div>
        ))}
      </dl>
      <SessionShape blocks={blocks} />
      <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-control items-center rounded-md bg-primary px-3 font-semibold text-primary-foreground">
          Accepter
        </span>
        <span className="inline-flex h-control items-center rounded-md border border-control-border bg-card px-3 font-medium">
          Garder 5 × 6’
        </span>
        <span className="inline-flex h-control items-center px-2 font-medium text-secondary-foreground max-md:hidden">
          Déplacer
        </span>
      </div>
    </div>
  );
}

function BodyPreview() {
  return (
    <div className="rounded-xl border border-border bg-muted px-1 pb-1">
      <p className="flex h-row items-center gap-2 px-2.5 font-medium text-secondary-foreground">
        <NavProgressIcon aria-hidden="true" className="size-4" />
        Ton corps ce matin
        <Status level="watch" className="ml-auto">
          Forme modérée
        </Status>
      </p>
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3.5">
        <p className="text-title font-semibold">
          3 signaux sur 4 hors de ta plage
        </p>
        <p className="text-label text-secondary-foreground">
          Forme 58 · ta moyenne sur 14 jours : 69 · jambes fraîches
        </p>
        <div className="mt-1 grid border-t border-border sm:grid-cols-2 sm:gap-x-6">
          {signals.map((signal) => (
            <Plage
              key={signal.name}
              name={signal.name}
              range={signal.range}
              value={signal.value}
              level={signal.level}
              verdict={signal.verdict}
              scale={signal.scale}
              className="border-b border-border last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TodayPreview() {
  return (
    <figure
      aria-label="Exemple d’une matinée avec Stride"
      className="flex flex-col overflow-hidden rounded-2xl border border-control-border bg-card shadow-float"
    >
      <div className="flex items-baseline gap-2 border-b border-border px-4 py-2.5">
        <span className="font-semibold">Aujourd’hui</span>
        <span className="text-label text-muted-foreground">mer. 7 oct.</span>
      </div>
      <SessionPreview />
      <div className="border-t border-border p-3">
        <BodyPreview />
      </div>
    </figure>
  );
}
