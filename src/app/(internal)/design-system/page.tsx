import Link from "next/link";
import {
  LoaderCircleIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CoachNote } from "@/components/stride/coach-note";
import { Metric } from "@/components/stride/metric";
import { MonoLabel } from "@/components/stride/mono-label";
import { ProvenanceLabel } from "@/components/stride/provenance";
import { SessionShape } from "@/components/stride/session-shape";
import { StepperSegments } from "@/components/stride/stepper";
import { StrideMark } from "@/components/stride/stride-mark";
import { StrideLogo } from "@/components/stride/stride-logo";
import { SyncStatus } from "@/components/stride/sync-status";
import { Chip } from "@/components/stride/chip";
import { EmptyState, FeedbackBanner } from "@/components/stride/feedback";
import { Plage } from "@/components/stride/plage";
import { SessionList, SessionRow } from "@/components/stride/session-row";
import { Status } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import { ContextChipsExample } from "./_components/context-chips";
import { SuggestedRepliesExample } from "./_components/suggested-replies";
import { GallerySection, Specimen } from "./_components/specimen";

const surfaces = [
  ["Shell", "bg-shell", "shell"],
  ["Background", "bg-background", "background"],
  ["Card", "bg-card", "card"],
  ["Muted", "bg-muted", "muted"],
  ["Accent", "bg-accent", "accent"],
  ["Foreground", "bg-foreground", "foreground"],
] as const;

const states = [
  ["Dans ta plage", "bg-primary", "primary"],
  ["À surveiller", "bg-warning", "warning"],
  ["Alerte", "bg-destructive", "destructive"],
  ["Série 1", "bg-data-1", "data-1"],
  ["Série 2", "bg-data-2", "data-2"],
  ["Série 3", "bg-data-3", "data-3"],
] as const;

const lines = [
  ["Border", "border-border", "border"],
  ["Control", "border-control-border", "control-border"],
  ["Field", "border-input", "input"],
] as const;

const zones = [
  ["Récup · Z1", "bg-intensity-1"],
  ["Facile · Z2", "bg-intensity-2"],
  ["Tempo · Z3", "bg-intensity-3"],
  ["Seuil · Z4", "bg-intensity-4"],
  ["Fractionné · Z5", "bg-intensity-5"],
] as const;

const typeScale = [
  ["display", "text-display font-semibold", "Séance allégée aujourd’hui."],
  ["metric", "text-metric font-semibold tabular-nums", "46 ms"],
  ["verdict", "text-verdict font-semibold", "3 signaux sur 4 hors de ta plage"],
  ["title", "text-title font-semibold", "Seuil 4 × 6’"],
  [
    "body-lg",
    "text-body-lg text-secondary-foreground",
    "Une répétition en moins qu’au plan : l’allure ne change pas.",
  ],
  ["body", "text-body", "Sortie longue trail"],
  ["body-strong", "text-body font-semibold tabular-nums", "52 min"],
  ["label", "text-label font-medium text-muted-foreground", "plage 52–64 ms"],
  ["micro", "text-label font-medium text-muted-foreground", "Aujourd’hui"],
] as const;

const radii = [
  ["mark", "rounded-mark", "2px"],
  ["sm", "rounded-sm", "5px"],
  ["md", "rounded-md", "6px"],
  ["lg", "rounded-lg", "9px"],
  ["xl", "rounded-xl", "12px"],
  ["2xl", "rounded-2xl", "14px"],
] as const;

const motion = [
  ["Coach reading — trace sweep", "animate-trace", "1.6 s loop"],
  ["Recommendation — rise 8 px + fade", "animate-rise", "320 ms"],
  ["Import lane — sheen sweeps the bar", "animate-sheen", "1.8 s loop"],
  ["Sidebar ⌘B — width 264 → 56", "duration-220", "220 ms"],
  ["Sync — dot breathes", "animate-breathe", "2.4 s"],
  [
    "Plage — point slides into its range",
    "animate-plage-reveal",
    "600 ms, 80 ms stagger",
  ],
  ["Key figures — count up once", "CountUp", "500 ms"],
  [
    "Load chart — band fades, lines draw, markers last",
    "animate-chart-draw",
    "700 ms",
  ],
] as const;

const session = [
  { minutes: 15, zone: 2 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1 },
  { minutes: 6, zone: 4 },
  { minutes: 2, zone: 1 },
  { minutes: 6, zone: 4 },
  { minutes: 8, zone: 4, removed: true },
  { minutes: 10, zone: 2 },
] as const;

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 py-12 sm:px-10 lg:px-20 lg:py-18">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-metric font-semibold tracking-[-0.045em]">
            <StrideLogo className="size-6" />
            Stride
          </span>
          <MonoLabel>Design system · internal</MonoLabel>
        </div>
        <h1 className="max-w-4xl text-display font-semibold text-balance">
          Radix bones, Stride skin.
        </h1>
        <p className="max-w-3xl text-body-lg text-pretty text-secondary-foreground">
          Dense tokens, shadcn primitives restyled for Stride, and the reusable
          product patterns from the approved system references. This surface
          exists for validation only and is not available in production.
        </p>
        <nav
          aria-label="Gallery sections"
          className="flex flex-wrap gap-x-5 gap-y-2 text-body"
        >
          {[
            ["#tokens", "Tokens"],
            ["#type", "Typography"],
            ["#controls", "Controls"],
            ["#overlays", "Overlays"],
            ["#dense-patterns", "Data patterns"],
            ["#patterns", "Other patterns"],
            ["#states", "States"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-secondary-foreground hover:text-foreground"
            >
              {label}
            </a>
          ))}
          <Link
            href="/design-system/shell"
            className="text-primary hover:text-foreground"
          >
            App shell →
          </Link>
        </nav>
      </header>

      <GallerySection
        id="tokens"
        index="01 · Tokens"
        title="Dense tokens"
        description="Colour only says a state: primary for in range or the action, warning to watch, destructive for an alert. Intensity is its own scale; everything else is grey."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <Specimen title="Surfaces" meta="bg-*">
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {surfaces.map(([name, fill, token]) => (
                <li key={token} className="flex flex-col gap-1.5">
                  <span
                    className={`h-11 rounded-md border border-border ${fill}`}
                  />
                  <span className="text-label">{name}</span>
                  <MonoLabel size="nano">{token}</MonoLabel>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen title="States and data series" meta="text-* · bg-*">
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {states.map(([name, fill, token]) => (
                <li key={token} className="flex flex-col gap-1.5">
                  <span className={`h-11 rounded-md ${fill}`} />
                  <span className="text-label">{name}</span>
                  <MonoLabel size="nano">{token}</MonoLabel>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen
            title="Intensité et zones cardiaques"
            meta="bg-intensity-1…5"
          >
            <ul className="grid grid-cols-5 gap-2">
              {zones.map(([name, fill]) => (
                <li key={name} className="flex flex-col gap-1.25">
                  <span className={`h-5 rounded-sm ${fill}`} />
                  <MonoLabel size="nano">{name}</MonoLabel>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen title="Lines and radii" meta="border-* · rounded-*">
            <div className="flex flex-wrap gap-2">
              {lines.map(([name, line, token]) => (
                <span
                  key={token}
                  className={`flex h-11 flex-1 items-center justify-center rounded-md border ${line} text-label text-secondary-foreground`}
                >
                  {name}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {radii.map(([name, radius, size]) => (
                <span
                  key={name}
                  className={`flex h-14 flex-col items-center justify-center border border-control-border bg-card ${radius}`}
                >
                  <span className="text-label">{name}</span>
                  <MonoLabel size="nano">{size}</MonoLabel>
                </span>
              ))}
            </div>
          </Specimen>
          <Specimen
            title="Motion"
            meta="explains, never decorates"
            className="lg:col-span-2"
          >
            <ul className="grid border-t border-border text-body sm:grid-cols-[minmax(0,1fr)_auto]">
              {motion.map(([label, token, timing]) => (
                <li
                  key={token}
                  className="col-span-full grid grid-cols-subgrid items-center gap-x-4 border-b border-border py-2.5"
                >
                  <span>{label}</span>
                  <MonoLabel>
                    {token} · {timing}
                  </MonoLabel>
                </li>
              ))}
            </ul>
            <p className="text-body text-muted-foreground">
              Reduced motion: everything resolves to its end state.
            </p>
          </Specimen>
        </div>
      </GallerySection>

      <GallerySection
        id="type"
        index="02 · Typography"
        title="One family"
        description="Inter everywhere, with tabular numerals where values align. Hierarchy comes from weight and grey, not size."
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ul className="flex flex-col border-t border-border">
            {typeScale.map(([token, style, sample]) => (
              <li
                key={token}
                className="grid gap-1 border-b border-border py-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline sm:gap-4"
              >
                <MonoLabel>{token}</MonoLabel>
                <span className={style}>{sample}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <Metric size="hero" value="4:38" unit="/km" />
              <MonoLabel className="text-right">metric-hero</MonoLabel>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-border pb-4">
              <Metric size="lg" value="18h10" />
              <Metric size="md" value="5:31" />
              <Metric size="sm" value="48" unit="bpm" />
            </div>
            <div className="flex flex-col gap-2">
              <MonoLabel tone="secondary">
                HRV 58 ms · Garmin · 28-day
              </MonoLabel>
              <MonoLabel tone="accent">07 · Reusable patterns</MonoLabel>
              <MonoLabel size="micro">Via Recovery + Training</MonoLabel>
              <MonoLabel size="nano">Training</MonoLabel>
            </div>
          </div>
        </div>
      </GallerySection>

      <GallerySection
        id="controls"
        index="03 · Controls"
        title="shadcn primitives in Dense"
        description="Every control keeps its Radix behaviour: keyboard support, focus management and ARIA state. Controls are 28px on desktop and 40px on touch; focus is a 2px primary ring offset by 2px."
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <Specimen title="Buttons" meta="Button">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="md">Accept</Button>
              <Button size="md" variant="neutral">
                Appliquer le brouillon
              </Button>
              <Button size="md" variant="outline">
                Keep 5 × 6
              </Button>
              <Button size="md" variant="ghost">
                Revert
              </Button>
              <Button size="md" variant="destructive">
                Disconnect Garmin
              </Button>
              <Button size="md" variant="link">
                Ask why
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="lg">Continue</Button>
              <Button size="sm" variant="outline">
                Keep original
              </Button>
              <Button size="xs">Reconnect</Button>
              <Button size="icon-sm" variant="outline" aria-label="Add">
                <PlusIcon />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size="md" disabled>
                Disabled
              </Button>
              <Button size="md" disabled aria-busy="true">
                <LoaderCircleIcon
                  className="motion-safe:animate-spin"
                  aria-hidden="true"
                />
                Saving…
              </Button>
              <Button size="md" variant="outline" disabled>
                Unavailable
              </Button>
            </div>
          </Specimen>

          <Specimen title="Badges and keys" meta="Badge · Kbd">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Moderate</Badge>
              <Badge variant="warning">Needs approval</Badge>
              <Badge variant="warning">Change proposed</Badge>
              <Badge variant="accent">Your call · recorded</Badge>
              <Badge variant="success">Accepted</Badge>
              <Badge variant="danger">Sign-in expired</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-body text-secondary-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>⌘B</Kbd> collapse sidebar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>⌘J</Kbd> coach panel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>⌘K</Kbd> ask or command
              </span>
            </div>
          </Specimen>

          <Specimen title="Fields" meta="Field · Input · Textarea">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ds-name">First name</FieldLabel>
                <Input id="ds-name" defaultValue="Jules" />
              </Field>
              <Field data-invalid="true">
                <FieldLabel htmlFor="ds-email">Email</FieldLabel>
                <Input
                  id="ds-email"
                  defaultValue="jules@"
                  aria-invalid="true"
                  aria-describedby="ds-email-error"
                />
                <FieldError id="ds-email-error">
                  Enter a complete email address.
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-locked">Account email</FieldLabel>
                <Input
                  id="ds-locked"
                  defaultValue="jules@example.com"
                  disabled
                />
                <FieldDescription>
                  Disabled while a change is pending.
                </FieldDescription>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="ds-notes">Anything else?</FieldLabel>
                <Textarea
                  id="ds-notes"
                  placeholder="Old injuries, terrain you avoid…"
                />
              </Field>
              <div className="flex items-center gap-2.5">
                <Checkbox id="ds-terms" defaultChecked />
                <Label htmlFor="ds-terms">Keep me signed in</Label>
              </div>
            </div>
          </Specimen>

          <Specimen title="Choices" meta="ToggleGroup">
            <div className="flex flex-col gap-2">
              <span id="ds-surface-label" className="text-body">
                Mostly…
              </span>
              <ToggleGroup
                type="single"
                defaultValue="trail"
                aria-labelledby="ds-surface-label"
                className="grid grid-cols-3"
              >
                <ToggleGroupItem value="road">Road</ToggleGroupItem>
                <ToggleGroupItem value="trail">Trail</ToggleGroupItem>
                <ToggleGroupItem value="both">Both equally</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2">
              <span id="ds-days-label" className="text-body">
                Days you can run
              </span>
              <ToggleGroup
                type="multiple"
                variant="day"
                defaultValue={["tue", "wed", "thu", "sat", "sun"]}
                aria-labelledby="ds-days-label"
              >
                {[
                  ["mon", "M", "Monday"],
                  ["tue", "T", "Tuesday"],
                  ["wed", "W", "Wednesday"],
                  ["thu", "T", "Thursday"],
                  ["fri", "F", "Friday"],
                  ["sat", "S", "Saturday"],
                  ["sun", "S", "Sunday"],
                ].map(([value, short, name]) => (
                  <ToggleGroupItem key={value} value={value} aria-label={name}>
                    {short}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2">
              <span id="ds-access-label" className="text-body">
                You have access to
              </span>
              <ToggleGroup
                type="multiple"
                defaultValue={["hills", "gym"]}
                aria-labelledby="ds-access-label"
              >
                <ToggleGroupItem value="hills">Hills nearby</ToggleGroupItem>
                <ToggleGroupItem value="treadmill">
                  Treadmill with incline
                </ToggleGroupItem>
                <ToggleGroupItem value="gym">Gym / strength</ToggleGroupItem>
                <ToggleGroupItem value="track" disabled>
                  Track
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <ToggleGroup
              type="single"
              variant="segment"
              defaultValue="6mo"
              aria-label="Chart range"
            >
              <ToggleGroupItem value="6wk">6 wk</ToggleGroupItem>
              <ToggleGroupItem value="12wk">12 wk</ToggleGroupItem>
              <ToggleGroupItem value="6mo">6 mo</ToggleGroupItem>
              <ToggleGroupItem value="1yr">1 yr</ToggleGroupItem>
            </ToggleGroup>
          </Specimen>

          <Specimen title="Tabs" meta="Tabs · underline">
            <Tabs defaultValue="fitness">
              <TabsList aria-label="Progress sections">
                <TabsTrigger value="fitness">Fitness</TabsTrigger>
                <TabsTrigger value="recovery">Recovery</TabsTrigger>
                <TabsTrigger value="records">Records</TabsTrigger>
              </TabsList>
              <TabsContent
                value="fitness"
                className="text-secondary-foreground"
              >
                Your engine is growing faster than your top end.
              </TabsContent>
              <TabsContent
                value="recovery"
                className="text-secondary-foreground"
              >
                Sleep has been short three nights running.
              </TabsContent>
              <TabsContent
                value="records"
                className="text-secondary-foreground"
              >
                Half marathon 1:39:58 · Mar 2025.
              </TabsContent>
            </Tabs>
          </Specimen>

          <Specimen title="Progress and loading" meta="Progress · Skeleton">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-body">
                <span id="ds-import-label">Importing from Garmin</span>
                <MonoLabel>71%</MonoLabel>
              </div>
              <Progress value={71} aria-labelledby="ds-import-label" />
            </div>
            <div
              className="flex flex-col gap-2 rounded-xl border border-border p-4"
              aria-busy="true"
              aria-label="Loading session"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-9 w-full" />
            </div>
          </Specimen>
        </div>
      </GallerySection>

      <GallerySection
        id="overlays"
        index="04 · Overlays"
        title="Menus, dialogs and sheets"
        description="Overlays sit on a dimmed shell with hairline frames. No glass, no shadows."
      >
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="md" variant="outline">
                Account menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Jules · Profile 72%</DropdownMenuLabel>
              <DropdownMenuItem>
                <SettingsIcon />
                Settings
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>Answer 2 questions</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="md" variant="destructive">
                Disconnect Garmin
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Garmin?</AlertDialogTitle>
                <AlertDialogDescription>
                  New activities, sleep and HRV stop arriving. Your athlete
                  model and plan ledger stay as they are.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep connected</AlertDialogCancel>
                <AlertDialogAction variant="destructive">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="md" variant="outline">
                Approval sheet
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="mx-auto max-w-xl">
              <SheetHeader>
                <SheetTitle>Approve change</SheetTitle>
                <SheetDescription>
                  A bottom sheet for a decision that needs room.
                </SheetDescription>
              </SheetHeader>
              <div className="flex gap-2 px-4 pb-6">
                <Button size="md">Accept</Button>
                <Button size="md" variant="outline">
                  Keep 5 × 6
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                aria-label="Toggle coach panel"
              >
                <StrideMark />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Coach panel <Kbd>⌘J</Kbd>
            </TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="md" variant="outline">
                Notification panel
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 gap-1 p-3.5">
              <p className="text-[15px] font-semibold">Notifications</p>
              <p className="text-label text-muted-foreground">
                Popover · 14px radius, strong hairline
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </GallerySection>

      <GallerySection
        id="dense-patterns"
        index="05 · Dense patterns"
        title="Data patterns"
        description="Lists for what you browse, banded blocks for what you must understand. A state always carries its word."
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <Specimen title="Status and chips" meta="Status · Chip">
            <div className="flex flex-wrap items-center gap-6">
              <Status level="ok">Dans ta plage</Status>
              <Status level="watch">Sous ta plage</Status>
              <Status level="alert">Risque élevé</Status>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip>Route · plat</Chip>
              <Chip proposal>Proposition</Chip>
              <Chip intensity={1}>Récup</Chip>
              <Chip intensity={2}>Facile</Chip>
              <Chip intensity={3}>Tempo</Chip>
              <Chip intensity={4}>Seuil</Chip>
              <Chip intensity={5}>Fractionné</Chip>
            </div>
            <div className="flex flex-col gap-2">
              <ProvenanceLabel source="provider">
                Garmin · mis à jour aujourd’hui
              </ProvenanceLabel>
              <ProvenanceLabel source="manual">
                Toi · saisi à l’inscription
              </ProvenanceLabel>
              <ProvenanceLabel source="estimate">
                Estimation de Stride · confiance moyenne
              </ProvenanceLabel>
            </div>
          </Specimen>

          <Specimen title="Banded block and range" meta="Widget · Plage">
            <Widget
              headingLevel={4}
              title="Ton corps ce matin"
              verdict={<Status level="watch">2 signaux sur 3</Status>}
            >
              <div className="divide-y divide-border">
                <Plage
                  revealOrder={0}
                  name="Sommeil"
                  range="7h00–7h45"
                  value="5h52"
                  level="watch"
                  verdict="Sous ta plage"
                  scale={{
                    min: 300,
                    max: 540,
                    low: 420,
                    high: 465,
                    value: 352,
                  }}
                />
                <Plage
                  revealOrder={1}
                  name="Charge 7 j"
                  range="0,8–1,3"
                  value="1,24"
                  level="ok"
                  verdict="Dans ta plage"
                  scale={{
                    min: 0.4,
                    max: 1.8,
                    low: 0.8,
                    high: 1.3,
                    value: 1.24,
                  }}
                />
                <Plage
                  revealOrder={2}
                  name="VFC"
                  range="52–64 ms"
                  value="38 ms"
                  level="alert"
                  verdict="Hors plage depuis 3 jours"
                  scale={{ min: 34, max: 72, low: 52, high: 64, value: 38 }}
                />
              </div>
            </Widget>
          </Specimen>

          <Specimen title="Session rows" meta="SessionRow · SessionList">
            <SessionList>
              <SessionRow state="rest" past day="Lun 5" title="Repos" />
              <SessionRow
                state="done"
                past
                day="Mar 6"
                title="Footing"
                intensity={{ level: 2, label: "Facile" }}
                duration="50 min"
                distance="8,3 km"
              />
              <SessionRow
                state="today"
                day="Mer 7"
                title="Seuil 4 × 6’"
                intensity={{ level: 4, label: "Seuil" }}
                duration="52 min"
                distance="9,6 km"
              />
              <SessionRow
                state="upcoming"
                day="Sam 10"
                title="Côtes 8 × 3’"
                intensity={{ level: 5, label: "Fractionné" }}
                duration="60 min"
                distance="9,0 km"
              />
            </SessionList>
          </Specimen>

          <Specimen title="Feedback" meta="FeedbackBanner · EmptyState">
            <FeedbackBanner
              level="alert"
              verdict="Synchro interrompue"
              action={
                <Button size="sm" variant="outline">
                  Relancer
                </Button>
              }
            >
              Garmin n’a pas répondu depuis 06:12. Vérifie ta connexion, puis
              relance.
            </FeedbackBanner>
            <EmptyState
              title="Aucune course à venir"
              action={<Button size="sm">Ajouter une course</Button>}
            >
              Ajoute ta prochaine course : Stride construira le plan autour
              d’elle.
            </EmptyState>
          </Specimen>
        </div>
      </GallerySection>

      <GallerySection
        id="patterns"
        index="06 · Patterns"
        title="Other patterns"
        description="Patterns in use outside the core Dense set: session structure, coach notes, metrics and onboarding progress."
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Specimen title="Session structure" meta="SessionShape">
            <SessionShape blocks={session} />
            <p className="text-label text-muted-foreground">
              Session structure: width is time, colour is intensity, warm-up and
              recoveries lower and faded, a removed rep dashed.
            </p>
          </Specimen>
          <Specimen title="Context chips" meta="ContextChip · ContextChipLink">
            <ContextChipsExample />
            <p className="text-label text-muted-foreground">
              Removable chip for an item attached in the composer, and the link
              chip on the sent message. 44px targets below md.
            </p>
          </Specimen>
          <Specimen title="Suggested replies" meta="SuggestedReplies">
            <SuggestedRepliesExample />
            <p className="text-label text-muted-foreground">
              Short replies above the Coach composer that send on tap. Pills
              with 44px targets that scroll below md, compact outline buttons
              that wrap from md.
            </p>
          </Specimen>
          <Specimen title="Coach notes" meta="CoachNote · Metric">
            <CoachNote
              action={
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto px-0 text-body"
                >
                  Ask why
                </Button>
              }
            >
              HR drift rose on 4 of 5 long runs since August, all above 22°C.
              I&apos;d like to test fuelling earlier on Sunday before calling it
              a fitness issue.
            </CoachNote>
            <div className="flex items-end gap-3">
              <Metric size="hero" value="58" />
              <div className="flex flex-col gap-1 pb-2">
                <span className="text-body-lg font-medium">
                  Moderate readiness
                </span>
                <span className="text-body text-secondary-foreground">
                  14-day avg 69 · mostly sleep
                </span>
              </div>
            </div>
          </Specimen>
        </div>
      </GallerySection>

      <GallerySection
        id="states"
        index="07 · States"
        title="Sync, onboarding progress and messages"
        description="One component per state machine. Every state carries a shape or label so colour is never the only cue."
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <Specimen title="Sync status" meta="one component, five states">
            <div className="flex flex-col gap-3">
              <SyncStatus state="importing" progress={58}>
                Importing history — now at 2021
              </SyncStatus>
              <SyncStatus state="current">Up to date · 12 min ago</SyncStatus>
              <SyncStatus state="partial">
                Partial · no HRV before 2023
              </SyncStatus>
              <SyncStatus state="retrying">
                Garmin not responding · retrying
              </SyncStatus>
              <SyncStatus
                state="expired"
                action={<Button size="xs">Reconnect</Button>}
              >
                Sign-in expired
              </SyncStatus>
            </div>
          </Specimen>
          <Specimen title="Onboarding progress" meta="StepperSegments">
            <StepperSegments
              statuses={[
                "done",
                "done",
                "background",
                "current",
                "upcoming",
                "upcoming",
              ]}
              currentProgress={0.6}
            />
            <p className="text-body text-muted-foreground">
              Segments across the top of each onboarding step.
            </p>
          </Specimen>
          <Specimen title="Messages" meta="Alert · empty">
            <Alert>
              <AlertTitle>No activities yet</AlertTitle>
              <AlertDescription>
                Your first Garmin sync usually lands within a few minutes.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>That code wasn&apos;t accepted</AlertTitle>
              <AlertDescription>
                Request a new one from Garmin and try again.
              </AlertDescription>
            </Alert>
            <ProvenanceLabel source="provider">
              Garmin synced 06:12
            </ProvenanceLabel>
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-control-border p-5">
              <MonoLabel>Empty · races</MonoLabel>
              <p className="text-body text-secondary-foreground">
                No goal race yet. Stride plans around your availability until
                you add one.
              </p>
              <Button size="sm" variant="outline">
                Add a race
              </Button>
            </div>
          </Specimen>
        </div>
      </GallerySection>
    </main>
  );
}
