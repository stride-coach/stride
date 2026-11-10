# Stride design system

Stride's visual direction is **Dense**: a lot of data and no noise. The [Stride Design System](https://claude.ai/artifact/SbP5TijwXUuGmWBR8hqXht) holds its tokens, rules and component pages, and the `V2 · Dense` page of the [design board](design-board.md) holds the screens. Both are the visual source of truth. Read them through the Artifact tool, starting with `project/README.md` and `project/tokens.json` of the design system. Production code matches their intent with Stride architecture, Tailwind and shadcn primitives; never copy their markup.

Six rules drive every screen:

1. A verdict before a number: each block opens on a word or sentence of verdict, then shows the value that justifies it.
2. Always relative to the athlete: a health metric shows "ta plage" (the habitual range) and today's point.
3. Colour only says a state. `primary` is "in your range" or the action, `warning` is "to watch", `destructive` is an alert, and `intensity-1` to `intensity-5` is how hard a session is. Everything else is grey.
4. Lists for what is browsed, banded cards for what must be understood.
5. One body size: 13px everywhere, hierarchy through weight and grey.
6. The relief is the only decoration, in the app frame, never behind data.

## Color

Values live once in `src/app/globals.css`: `:root` holds the dark theme, `:root[data-theme="light"]` the light theme, and `@theme inline` exposes them as utilities. Token names follow shadcn.

| Token                  | Dark      | Light     | Use                                                                                   |
| ---------------------- | --------- | --------- | ------------------------------------------------------------------------------------- |
| `shell`                | `#070809` | `#EFEFEC` | App frame behind the top bar and sidebar (`--sidebar`); carries the relief            |
| `background`           | `#0C0D0F` | `#FAFAF9` | Content panel and pages                                                               |
| `card`                 | `#121316` | `#FFFFFF` | Inner card, fields, outline buttons, menus (`--popover`)                              |
| `muted`                | `#18191D` | `#F2F2F0` | Card banner, section banner, hovered or selected row, active tab (`--secondary`)      |
| `border`               | `#1E2025` | `#E6E6E2` | Hairline between zones, list rows, card outline                                       |
| `control-border`       | `#2B2D34` | `#D4D4CF` | Discreet outline of outline buttons, chips and tracks; never the only edge of a field |
| `input`                | `#666A74` | `#82858D` | Field and checkbox outline, at least 3:1                                              |
| `foreground`           | `#EDEEF0` | `#17181A` | Main text, numbers, and the "what you did" series of a chart                          |
| `secondary-foreground` | `#B3B6BD` | `#44464C` | Supporting prose, coach sentence, row labels                                          |
| `muted-foreground`     | `#868A94` | `#666970` | Units, dates, legends, axis text                                                      |
| `primary`              | `#6E9BFF` | `#2456E6` | Action, link, focus ring (`--ring`), "dans ta plage", easy effort                     |
| `primary-foreground`   | `#06102A` | `#FFFFFF` | Text and icons on `primary`                                                           |
| `accent`               | `#131D36` | `#E4EBFD` | Brand tint: range band, "Proposition" chip, planned zone of a chart                   |
| `warning`              | `#E5B45A` | `#8F5C06` | "À surveiller", today's session; always with a word                                   |
| `destructive`          | `#F0806A` | `#B3321B` | Alert, error, destructive action; always with a word                                  |
| `intensity-1` … `-5`   | see CSS   | see CSS   | Session intensity (Récup to Fractionné) and heart-rate zones Z1 to Z5; fills only     |
| `data-1` … `-3`        | see CSS   | see CSS   | Secondary chart series without state or intensity, most discreet to strongest         |
| `relief`, `-strong`    | see CSS   | see CSS   | Contour lines of the frame; decorative                                                |

- Every text token keeps 4.5:1 and `input`, the focus ring and chart marks keep 3:1 on `shell`, `background`, `card` and `muted`, in both themes.
- A state never relies on colour alone: a dot or a tint always comes with its word.
- There is no success green: a done session, a finished sync or a confirmation use `primary`.
- No tinted surface or outline for a state: a banner stays on `card` with a `border` hairline and the status word carries the colour.
- Data has no source colour. Garmin is named, never coloured, and staff roles have no colour.
- Never use an intensity colour outside a session or a heart-rate zone, and never as text.
- Supporting text is `text-secondary-foreground`; `muted` is a surface and never a text colour. `secondary-foreground` is therefore not shadcn's "text on `bg-secondary`": on a registry component that pairs the two, use `text-foreground`. Registry `bg-accent` hover states become `bg-muted`.

### Themes

The theme follows the operating system by default. Athletes can force Clair or Sombre, or go back to Système, from the header theme menu (`src/features/theme`). The choice is stored per browser under `stride-theme`, and an inline script sets `data-theme` on `<html>` before first paint. Components use semantic utilities and need no `dark:` variants. Both themes are equal: same structure, only token values change, and something that stands out in one theme stands out as much in the other. Maps switch between the CARTO Dark Matter and Positron styles.

## Typography

Inter is the only family, loaded with `next/font` in `src/app/fonts.ts`. Use `tabular-nums` wherever values align; there is no monospace or condensed face, and labels are never uppercase.

| Utility                       | Size | Weight | Use                                                          |
| ----------------------------- | ---- | ------ | ------------------------------------------------------------ |
| `text-display`                | 44px | 600    | Empty page or strong moment, never in a data page            |
| `text-metric`                 | 24px | 600    | Main value of a metric card, with `tabular-nums`             |
| `text-verdict`                | 20px | 600    | Verdict sentence at the top of a card or a coach reading     |
| `text-title`                  | 18px | 600    | Today's session title, panel title                           |
| `text-body-lg`                | 14px | 400    | Coach sentence, explanation paragraph                        |
| `text-body`                   | 13px | 400    | Default body: rows, buttons, navigation (the `body` default) |
| `text-body` + `font-semibold` | 13px | 600    | What matters in a row: value, session title, active page     |
| `text-label`                  | 12px | 500    | Section banner, verdict word, range, chip, legend            |
| `text-micro`                  | 10px | 500    | Mobile tab bar and chart ticks only, never a datum           |

Each size carries its line height and tracking. `MonoLabel` and `Metric` keep their API for existing screens and render with this scale. `cn` in `src/lib/utils.ts` is configured with these sizes and the `mark` radius so that class merging keeps a size next to a text colour; extend it when adding a size or radius token.

## Shape, spacing and size

Radii: `rounded-mark` (2px) for intensity blocks and chart bars, `rounded-sm` (5px) for chips and keys, `rounded-md` (6px) for buttons, fields and navigation entries, `rounded-lg` (9px) for the inner card of a banded block, `rounded-xl` (12px) for banded blocks and the content panel, and `rounded-2xl` (14px) for the app frame and mobile sheets.

Spacing follows Tailwind's 4px grid. Size tokens are spacing utilities: `row` (38px list row), `row-touch` (42px), `control` (28px desktop button or field), `control-touch` (40px mobile primary action), `topbar` (48px), `header` (44px panel header), `sidebar` (212px), `rail` (52px) and `panel` (308px context panel), for example `h-row` or `w-sidebar`.

Separate zones with a one-pixel `border` and a change of background, never a shadow; only a floating panel casts one. Avoid glass, gradients and glows.

## Halo

The Night Track halo (`src/components/stride/halo.tsx`) still renders on auth, onboarding welcome and highlight moments, mapped to the neutral `relief-strong` with a `primary` end point, until the relief replaces it and it is removed in #407. Do not add new uses.

## Components and shadcn

Stride's UI has three layers:

1. **Primitives** in `src/components/ui`: shadcn/Radix components installed with the official CLI and restyled to Dense. They own accessibility and behavior and know nothing about running.
2. **Stride patterns** in `src/components/stride`: reusable product compositions from the system references, built on the primitives. They take content and state through props and contain no data fetching or domain decisions.
3. **Screens and features** in `src/app` and `src/features`: compose patterns and primitives. They do not recreate low-level styles.

Installed primitives: Alert, AlertDialog, Badge, Button, Checkbox, Collapsible, DropdownMenu, Field, Input, InputGroup, Kbd, Label, Popover (the desktop notification panel: 14px radius, strong hairline), Progress, Separator, Sheet, Sidebar, Skeleton, Sonner (`Toaster`), Tabs, Textarea, Toggle, ToggleGroup, and Tooltip. Current specifics, restyled in #390:

- `Button` variants are `default` (`primary`), `outline`, `secondary`, `neutral` (foreground fill for draft application), `ghost`, `destructive`, and `link`; size `default`/`lg` is the full-size form action, `md` the compact 38px action used in cards, and `sm`/`xs` the inline actions.
- `Badge` is the status tag (`outline`, `accent`, `success`, `warning`, `danger`); its tinted variants predate Dense and follow the Chip and Status pages after #390. Counts and readiness values in navigation use `NavBadge`.
- `ToggleGroup` variants are `choice` (foreground fill when selected), `day` (round, `primary` ring), and `segment` (connected range control). `Tabs` are underline tabs with a `primary` indicator.
- `Sidebar` is configured for 264px expanded, a 56px icon rail with tooltips, and an off-canvas sheet below 768px. Use `variant="inset"` and `collapsible="icon"`.
- Primitives do not use `dark:` variants: the theme comes from `data-theme`, not directly from the operating system.

Stride patterns: `MonoLabel`, `SectionHeader`, `Metric`, `StrideMark`, status marks (`TrendMark`, `TrendLabel`, `DirectionMark`, `SourceMark`, `DecisionMark`, `DoneMark`, `PulseDot`), `VerdictList`/`VerdictRow`, `ProvenanceLabel`, `SignalList`/`SignalRow`, `ProviderValueInput`, `SignalChip`, `ContextChip`/`ContextChipLink` (an item attached to a Coach message: icon, title and mono date; the removable chip sits in the composer with a remove button that is 44px below `md`, the link chip sits on the sent message and opens the record), `SuggestedReplies` (a group of short French replies above the Coach composer; outline pills of 44px that scroll horizontally below `md`, 32px buttons that wrap from `md`; a tap sends the reply), `ConfidenceMeter`, `Sparkline`, `Halo`, `Recommendation` and its parts, `LedgerEntry`/`DecisionLegend`, `CoachActivity`, `CoachNote`, `SyncStatus`, `Stepper`/`StepperItem`/`StepperSegments`, `SessionShape`, `SessionKindTile` (session family tile in four sizes, with rest and race states), the sidebar parts (`NavGoalSwitcher`, `NavItem`, `NavBadge`, `NavDayRow`, `NavUser`), and `MobileTabBar`/`MobileTab`/`MobileAskAction` (the central Coach action takes an active state and a count badge).

Tailwind utilities inside React components own layout, responsive behavior, typography, and component appearance. Reserve `globals.css` for tokens, base styles, and global accessibility defaults.

### Reuse rule

Before creating a new component or local style:

1. Check the installed shadcn primitives in `src/components/ui` and the official registry.
2. Check the Stride patterns in `src/components/stride` and the design system gallery.
3. Reuse or extend them, adding a variant or prop when the reference shows a genuine variation.
4. Create a new abstraction only when the pattern is genuinely new, and put it in the right layer.

Auth, onboarding, and application screens must compose this system rather than recreate local variants.

### Feedback messages

The outcome of an action is a sonner toast: `toast.success` after every successful mutation, upload, copy or sync request, and `toast.error` when an action, a mutation or a Coach turn fails. The `Toaster` is mounted once in the root layout with the card surface, a close button and a single 6-second duration. Toasts carry one short French sentence; secondary detail goes in `description`. Pass an `id` when the same action can repeat, so a new toast replaces the previous one. Server actions that redirect report their result through a `?status=` parameter read by a client notice such as `SettingsNotice`, which shows the toast and clears the parameter.

A notification records something that happened in the background, such as a proposal ready for review or a staff reply, and waits in the notification center until the athlete reads it. It never repeats a toast: the athlete's own actions get a toast, and when such an action settles a notification, for example applying or rejecting a proposal or answering a question, the notification is resolved and read instead of a new one being created.

Keep a message inline when it belongs to the page rather than to the action: field and step validation, form validation summaries, form-level sign-in, sign-up, recovery and reset errors, Garmin credential and code notices, actionable conflicts, autosave indicators, persistent connection and review banners, empty states, loading states and error boundaries.

### Validation gallery

`/design-system` renders every token, primitive, pattern, and state, and `/design-system/shell` renders the application shell with the expanded sidebar, the icon rail, and the mobile sheet and tabs. Both routes are development-only: they return 404 in production builds. Use them to compare against the design system and the board's `V2 · Dense` artboards at the same viewport before and after changing the system. Browser tests in `tests/e2e/design-system.spec.ts` cover keyboard behavior, state exposure, reduced motion, and responsive fit.

## Loading and motion

Server reads, revalidation after mutations, prefetching and programmatic navigation follow [frontend data loading](../architecture/frontend-data-loading.md).

### Garmin data activity

The authenticated shell owns one data activity controller. Its read-only panel shows the four normalized Garmin categories, their actual state, last success and verified activity count. The application status endpoint is independent of onboarding and validates responses without exposing provider credentials. The athlete can request a sync with "Synchroniser maintenant" in the panel or in Garmin settings, or with a pull-to-sync gesture (64 px) at the top of a mobile screen. The request goes through `requestGarminSync`, which calls garmin_mcp `POST /v1/connections/garmin/sync`. While its activities and recovery jobs run, the status line reads `Garmin · n sur 2 · famille` and the thread fills instead of sweeping. When they settle, the page refreshes without the "Afficher" pill. garmin_mcp accepts one request every five minutes, so the controls stay disabled until `manual_sync_available_at` and say when a sync becomes possible. Background syncs keep the quiet behavior and the pill.

Polling is serialized, pauses while hidden or offline, aborts on unmount and stops after four consecutive failures. A valid observation is retained during outages. Active imports use `primary`, with a single thread delayed by 300ms and visible for at least 600ms. Once shown, it waits 250ms before hiding so back-to-back signals keep one continuous thread instead of restarting. A screen change has one feedback only: when a route loading boundary mounts its fallback, the fallback replaces navigation feedback and a navigation thread hides at once. Supported Next Link pending state and focused router transitions show the thread only while no fallback is mounted, for example in-place filter, search or period changes and routes without a loading boundary, while existing content remains readable. Synchronization and data refreshes still show the thread over a fallback. Fallback registration follows mount and unmount. Prefetched instant transitions and modified clicks do not register navigation activity. Page loading never changes the synchronization status into a page-loading claim. Each screen header owns the thread at its actual bottom border. Activities show it in the list header on mobile list screens and in the preview toolbar on desktop and mobile detail screens, with exactly one visible thread. Activity fallbacks reuse the real split frame and headers. During preview suspension, the latest resolved list snapshot keeps matching filter, search and pagination content readable and restores its saved scroll position; only the preview shows placeholders. Initial list loads and previews without a matching snapshot show list placeholders. The snapshot lives only within the activities routes, and resolved server data replaces it, including after explicit Garmin fresh-data application. Server list reads and revalidation remain unchanged. Known header titles remain readable text. Screen scroll containers reserve a stable scrollbar gutter so a short fallback and the taller resolved content keep the same width. Race workspace fallbacks cover content only because their layouts already own the headers, and they show no thread. The races list uses a route group layout that owns the header, so its fallback keeps the real title and filter, which stay readable while only the dependent content is skeletonized. Every page under `(app)` and `settings` has a route loading boundary, so a screen change shows the destination skeleton at once, following the board's `Foundations · Loading states` rules: known titles, breadcrumbs, section tabs and filters stay real, data-dependent content becomes simple shapes at the final geometry, and the skeleton registers through `LoadingScope` with a French `Chargement de …` label. A route whose child routes need their own skeleton keeps its page in a route group, such as `coach/(list)`, `gear/(list)`, `gear/[id]/(detail)`, `progress/(fitness)`, `settings/(overview)` and `settings/connections/(overview)`, so a parent fallback never stands in for a child screen. Activity list loading is isolated in the `(list)` group. The race detail layout awaits owner-scoped data, so it sits in a `(detail)` route group whose loading boundary renders the full entry skeleton: the race header and breadcrumb placeholders, without tabs because their number depends on the race kind. The `[id]` loading boundary still covers race tab switches. Activity routes have no data-awaiting layout: each page resolves its own activity, so `activities/[id]/loading.tsx` renders the preview skeleton with the retained list snapshot at once, in a single phase. The former `[id]/details` URL redirects to `[id]` in `next.config.ts`. A list row whose activity is already displayed in the detail pane does not navigate, and the route map rebuilds only when its route changes, not when a refresh delivers an equal view. Because the fallback starts the stream, an unknown or foreign race, activity, pair or conversation streams the not-found screen with status 200 and a `noindex` robots meta tag, as documented for Next streaming; ownership checks are unchanged and no data from another athlete is rendered. Initial direct SSR still waits for authentication in the root layouts before streaming. The app and settings layouts then await only the athlete identity (profile and goals), so the name, staff portraits, goal and race links render with the frame. Navigation badges, the plan blocks group, coach attention and the notification feed stream behind `<Suspense>`: nav items render without their badge, the plan group shows label and placeholder rows on plan routes, and the bell links to `/notifications` until the feed arrives. The shell never reads Garmin on the server: the data activity provider starts in a `checking` state, shown as a status placeholder announced as "Chargement de l’état Garmin", until its first poll resolves; the reconnect banner and the Connexions sync age follow that poll. Slow blocks stream inside a ready screen. The Corps day view renders its header, day navigator and seven-night strip from stored data, then streams the live Garmin day (KPIs, timeline, reading, night and moments) behind `HealthDayLoading`, keyed by day so a day change shows that skeleton under the navigator. On the race Course tab, the Open-Meteo weather streams: until it resolves, the map and profile render without the rain layer, then fill it in place. Synchronization labels such as `Synchronisé 06:12` on Corps come from the client data activity observation, so no page reads Garmin on the server for a label. The root page and the `(app)`, `settings`, `onboarding` and `coach-spike` layouts keep `force-dynamic`: without Supabase environment variables, as in CI builds, the Supabase client throws before `cookies()` is read, so Next would otherwise try to prerender those routes.

Background observations never refresh the screen. New category success timestamps or increasing activity counts offer an explicit **Afficher** action; applying or navigating acknowledges that observation. Poll timestamps alone do not count as fresh data. Status and notification overlays preserve screen geometry. Offline stops the thread and keeps readable content. Garmin reconnect stops synchronization activity only; pending stored-data page navigation still shows its thread.

The backend reports categories rather than individual metric freshness. Existing activity and health values can therefore be scoped to activities and recovery only; the UI must not invent per-metric import states. Category-scoped metric values dim during actual imports while labels remain readable. Unrelated race content remains unchanged.

Prefer React Server Components and stable content. Use local skeletons only for independently loading content; their geometry should match the final content and their contrast should stay subtle. Long imports and synchronization need explicit progress and states such as partial, delayed, retrying, or reconnect required, not a full-page spinner or skeleton pretending to be progress.

Motion explains state and hierarchy. Keep transitions restrained; reference timings are starting points, not required animations. Respect `prefers-reduced-motion` by resolving transitions and animations to their end state. Do not animate for decoration.

Motion tokens: `ease-stride` (`cubic-bezier(0.2, 0.8, 0.2, 1)`, the single curve), durations `--stride-duration-fast` (150ms), `-base` (220ms), `-slow` (320ms) and `-reveal` (600ms), `animate-rise` (320ms rise 8px and fade for recommendations and findings), `animate-trace` (1.6s coach reading sweep), `animate-sheen` (1.8s import lane), `animate-breathe` (2.4s sync dot), `animate-halo-breathe` (8s halo breathing) and `animate-halo-draw` (2s halo trace draw-in). The sidebar collapses in 220ms. Apply looping animations with `motion-safe:` so reduced motion shows the static end state.

## Errors and missing items

Errors and missing items stay inside the app shell, following the board's `System · In-app error` and `System · In-app not found` artboards. The sidebar, header and mobile tab bar remain usable, and no technical detail reaches the athlete; server errors are still logged by Next.

- `(app)/error.tsx` and `settings/error.tsx` render `RouteError` (`src/features/app-shell/components/route-state.tsx`): an `alert` with "Cette page n’a pas pu se charger.", a **Réessayer** button wired to the boundary's `retry()`, and a link back to Aujourd’hui. In `(app)`, the header names the current section from the URL.
- `notFound()` resolves to the nearest segment `not-found.tsx`, which renders `RouteNotFound` with item-specific French copy from `missingItems` (`src/features/app-shell/route-state.ts`): activity (`activities/[id]`), race (`races/(detail)`, because the race layout calls `notFound()`), pair (`gear/[id]`), conversation (`coach/[thread]`), and a generic page fallback at `(app)/not-found.tsx`. Each offers its list and Aujourd’hui.
- Outside the shell, `app/error.tsx` (for example when the app layout cannot read the athlete identity) and `app/global-error.tsx` (root layout failure) reuse the standalone 404 layout (`StandalonePage`) with the same error copy. `global-error` brings its own document, fonts, global styles and theme script. Unknown URLs still use the standalone root `not-found.tsx`.

## Responsive behavior

Preserve information hierarchy from desktop to mobile. The references show a desktop contextual sidebar and inset work area; below `md`, the sidebar becomes a sheet and `AppShell` renders the mobile tab bar at the bottom of the inset, in flow: Aujourd’hui, Plan, the central Coach action with the pending-attention badge, Activités and Progression. The bar is hidden in conversations (`/coach/new`, `/coach/<thread>`), where the composer takes the bottom, and the fresh-data pill sits above it. Keep status and provenance visible at narrow widths. Each screen has desktop and mobile artboards on the [design board](design-board.md). Artboard HTML explains structure and exact values but must not be copied into production.

## Reference use

Before styling a screen, read its matching artboard for the target device and the design system's `README.md` and token pages, as described in [design-board.md](design-board.md). Compare implementation screenshots at the same viewport, iterate on material differences, and retain accessible focus, contrast, and reduced-motion behavior. System patterns include the contextual sidebar, recommendation anatomy, decision ledger, provenance rows, sync-state banners, onboarding stepper, verdict rows, and restrained coach activity indicator; reuse these where the screen needs them rather than creating new visual idioms.

The design board is a read-only input, never a source of application assets. Do not export, recreate, transform, or derive production assets from it without explicit instruction. Keep temporary comparison screenshots untracked in `test-results/` or outside the repository; do not commit visual validation evidence by default.

## Profile settings editing

All settings screens share the content panel background. Profile settings use a centered 1000px content container, 180px labels and 320px controls on desktop; mobile groups use inset surfaces and stacked provenance. Other settings screens retain their full-width composition. Heart-rate editing expands within the desktop metric row and uses the existing focus-trapping Sheet primitive on mobile. Applying an editor stages the value; the dirty save bar persists the full draft, and cancel restores the saved snapshot. Maximum editing contains only a bpm input. Threshold editing records an explicit lab, field-test or known-value source, without claiming unsupported threshold estimates, confidence, changed zones or adjusted sessions. The VFC row identifies the latest recorded night rather than an unimplemented 28-day baseline.
