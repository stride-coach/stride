import type { Metadata } from "next";
import { CheckIcon, HistoryIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import {
  DataFigure,
  DataRow,
  DataSection,
  GarminStatus,
} from "@/features/settings/components/data-rows";
import {
  SyncNowButton,
  SyncRequestMessage,
} from "@/features/data-activity/components/sync-request";
import { garminSyncCategories, syncPhase } from "@/features/garmin/sync";
import type { GarminConnectionStatus } from "@/features/garmin/connection";
import {
  clockLabel,
  dayLabel,
  recentLabel,
  relativeSince,
  sinceLabel,
  timelineCells,
  type YearCell,
} from "@/features/garmin/settings-view";
import {
  latestSentAt,
  watchRowLabel,
  watchSentLabel,
  watchUpcoming,
} from "@/features/garmin/watch";
import {
  WatchRowAction,
  WatchToggle,
} from "@/features/garmin/components/watch-settings";
import { cn } from "@/lib/utils";
import { requireAthleteAccount } from "@/server/app/session";
import { loadWatchView } from "@/server/garmin/watch";
import { loadPlanOverview } from "@/server/plans/overview";
import {
  readGarminRecentData,
  readSettingsConnection,
  readStoredCounts,
} from "@/server/settings/data";

export const metadata: Metadata = { title: "Garmin · Réglages" };

const categoryLabels = {
  activities: {
    title: "Activités",
    detail: "Course, trail et autres séances enregistrées",
  },
  recovery: {
    title: "Sommeil et récupération",
    detail: "Sommeil, FC au repos, VFC et stress",
  },
  fitness: {
    title: "Indicateurs de forme",
    detail: "VO₂ max et autres mesures disponibles",
  },
  patterns: {
    title: "Habitudes d’entraînement",
    detail: "Tendances de l’historique importé",
  },
};
const metricLabels: Record<string, string> = {
  resting_heart_rate_bpm: "FC au repos",
  hrv_last_night_ms: "VFC de la nuit",
  vo2_max: "VO₂ max",
  sleep_duration_seconds: "Durée de sommeil",
  sleep_score: "Score de sommeil",
  stress_level: "Niveau de stress",
  body_battery: "Body Battery",
};
const reconnectStatuses = new Set<GarminConnectionStatus>([
  "expired",
  "reconnect_required",
]);
const unavailableStatuses = new Set<GarminConnectionStatus>([
  "rate_limited",
  "provider_unavailable",
]);

function Timeline({ cells, label }: { cells: YearCell[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="grid grid-cols-9 gap-0.5">
      {cells.map((cell, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-mark",
            cell === "full" && "bg-foreground",
            cell === "partial" && "bg-secondary-foreground",
            cell === "none" && "border border-dashed border-control-border",
          )}
        />
      ))}
    </div>
  );
}

function Banner({
  tone,
  children,
  aside,
}: {
  tone: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
    >
      {tone === "info" && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
        />
      )}
      {tone === "success" && (
        <CheckIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-primary"
        />
      )}
      {tone === "warning" && (
        <TriangleAlertIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-warning"
        />
      )}
      {tone === "danger" && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-destructive"
        />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      {aside}
    </div>
  );
}

const stateTone = {
  complete: "ok",
  partial: "watch",
  running: "watch",
  pending: "watch",
  failed: "alert",
} as const;

export default async function GarminSettingsPage() {
  const context = await requireAthleteAccount();
  const [{ connection, sync }, counts, recent, overview] = await Promise.all([
    readSettingsConnection(context),
    readStoredCounts(context),
    readGarminRecentData(context),
    loadPlanOverview(context).catch(() => null),
  ]);
  const watch = await loadWatchView(context, overview?.plan ?? null);
  const upcoming =
    watch.enabled && overview
      ? watchUpcoming({
          rows: watch.rows,
          planId: overview.plan.planId,
          sessions: overview.plan.state.sessions,
          today: overview.today,
          pendingKeys: overview.proposals.flatMap((proposal) =>
            proposal.targetKeys.map((key) => key.replace(/^session:/, "")),
          ),
        })
      : [];
  const watchFailures = upcoming.filter(
    (item) => item.state.kind === "failed",
  ).length;
  const lastWatchSend = watchSentLabel(latestSentAt(watch.rows));
  const now = new Date();
  const phase = sync ? syncPhase(sync) : null;
  const lastSync = connection?.lastSyncAt ?? sync?.lastSyncAt ?? null;
  const status = connection?.status ?? null;
  const reconnect = status !== null && reconnectStatuses.has(status);
  const unavailable = status !== null && unavailableStatuses.has(status);
  const connected = status === "connected";
  const syncedAgo = relativeSince(lastSync, now);
  const lastActivity = recentLabel(recent.activity?.started_at, now);
  const lastHealth = clockLabel(recent.observation?.imported_at);
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      timeZone: "Europe/Paris",
    }).format(now),
  );
  const oldestDates = sync
    ? garminSyncCategories.flatMap((category) => {
        const value = sync.categories[category].oldestSynchronizedDate;
        return value ? [value] : [];
      })
    : [];
  const historyOldest = oldestDates.toSorted()[0] ?? null;
  const reconnectedLabel = dayLabel(lastSync);
  const history: { key: string; when: string | null; text: string }[] = [];
  if (lastSync)
    history.push({
      key: "sync",
      when: recentLabel(lastSync, now),
      text: connected
        ? "Synchronisation automatique réussie"
        : "Dernière synchronisation",
    });
  if (recent.observation)
    history.push({
      key: "health",
      when: recentLabel(recent.observation.imported_at, now),
      text: `${metricLabels[recent.observation.metric] ?? "Mesure de santé"} importée`,
    });
  if (recent.activity)
    history.push({
      key: "activity",
      when: recentLabel(recent.activity.imported_at, now),
      text: recent.activity.activity_name ?? "Activité importée",
    });
  if (phase === "complete" && historyOldest)
    history.push({
      key: "history",
      when: recentLabel(sync?.updatedAt, now),
      text: `Import de l’historique terminé · depuis ${sinceLabel(historyOldest)}`,
    });

  const stats = [
    {
      value: syncedAgo ?? "—",
      label: `Dernière synchro${clockLabel(lastSync) ? ` · ${clockLabel(lastSync)}` : ""}`,
    },
    { value: lastHealth ?? "—", label: "Dernière donnée santé" },
    { value: lastActivity ?? "—", label: "Dernière activité importée" },
    {
      value:
        phase === "complete"
          ? "Terminé"
          : phase === "importing"
            ? "En cours"
            : phase === "attention"
              ? "À vérifier"
              : "—",
      label: `Import de l’historique${
        phase === "complete" && sync?.updatedAt
          ? ` · ${recentLabel(sync.updatedAt, now)}`
          : ""
      }`,
      success: phase === "complete",
    },
  ];

  const desktop = (
    <div className="flex flex-col gap-9">
      <section className="flex flex-col gap-3.5">
        <h1 className="text-verdict font-semibold">Garmin</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <GarminStatus
            status={status}
            suffix="synchronisation automatique"
            className="flex-1"
          />
          <div className="flex flex-wrap gap-2 max-md:w-full max-md:[&>*]:flex-1">
            <SyncNowButton variant="outline" />
            <Button
              variant="outline"
              disabled
              title="La reconnexion depuis les réglages n’est pas encore disponible"
            >
              Reconnecter
            </Button>
            <Button
              variant="ghost"
              disabled
              title="La déconnexion Garmin n’est pas encore proposée"
              className="text-destructive"
            >
              Déconnecter…
            </Button>
          </div>
        </div>
        <SyncRequestMessage className="text-body md:text-right" />
        {reconnect && (
          <Banner
            tone="danger"
            aside={
              <Button
                disabled
                title="La reconnexion depuis les réglages n’est pas encore disponible"
              >
                Reconnecter Garmin
              </Button>
            }
          >
            Ta connexion Garmin a expiré. Les nouvelles sorties et nuits
            n’arrivent plus
            {reconnectedLabel ? ` depuis le ${reconnectedLabel}` : ""}.
          </Banner>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3.5 md:grid-cols-4">
          {stats.map((item) => (
            <DataFigure
              key={item.label}
              value={item.value}
              label={item.label}
              valueClassName={item.success ? "text-primary" : undefined}
            />
          ))}
        </dl>
      </section>

      <Widget
        headingLevel={2}
        icon={<HistoryIcon />}
        title={<span id="garmin-data">Données Garmin</span>}
        verdict={
          <span className="text-label font-normal text-muted-foreground">
            par année
          </span>
        }
        aria-labelledby="garmin-data"
      >
        <div className="flex flex-col">
          <div
            aria-hidden="true"
            className="hidden items-end gap-4 pb-2 text-label text-muted-foreground md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)]"
          >
            <span />
            <span className="grid grid-cols-9 gap-0.5 tabular-nums">
              {timelineCells(null, currentYear).years.map((year) => (
                <span key={year}>{String(year).slice(2)}</span>
              ))}
            </span>
            <span className="text-right">Statut</span>
          </div>
          {sync ? (
            garminSyncCategories.map((category) => {
              const item = sync.categories[category];
              const label = categoryLabels[category];
              const { cells } = timelineCells(
                item.oldestSynchronizedDate,
                currentYear,
              );
              const since = sinceLabel(item.oldestSynchronizedDate);
              const value =
                item.activityCount !== null
                  ? `${new Intl.NumberFormat("fr-FR").format(item.activityCount)} importées`
                  : item.state === "complete" || item.state === "partial"
                    ? "Jusqu’à aujourd’hui"
                    : item.state === "failed"
                      ? "À vérifier"
                      : "En attente";
              const state =
                item.state === "complete"
                  ? item.activityCount !== null
                    ? "À jour"
                    : since
                      ? `Depuis ${since}`
                      : "À jour"
                  : item.state === "partial"
                    ? "Partiel"
                    : item.state === "running"
                      ? "En cours"
                      : item.state === "pending"
                        ? "En attente"
                        : "Dernière tentative échouée";
              return (
                <div
                  key={category}
                  className="grid items-center gap-2.5 border-t border-border py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{label.title}</span>
                    <span className="text-label text-secondary-foreground">
                      {label.detail}
                    </span>
                  </div>
                  <Timeline
                    cells={cells}
                    label={
                      since
                        ? `Données depuis ${since}`
                        : "Période non disponible"
                    }
                  />
                  <span className="flex flex-col gap-0.5 md:items-end">
                    <span
                      data-slot="metric"
                      className="font-semibold tabular-nums"
                    >
                      {value}
                    </span>
                    {state === value ? null : item.state === "complete" &&
                      item.activityCount === null ? (
                      <span className="text-label text-secondary-foreground">
                        {state}
                      </span>
                    ) : (
                      <Status level={stateTone[item.state]}>{state}</Status>
                    )}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="border-t border-border py-3 text-secondary-foreground">
              L’état de la synchronisation est momentanément indisponible.
            </p>
          )}
          <p className="border-t border-border pt-3 text-label text-secondary-foreground">
            Années en pointillés : Garmin n’a aucune donnée sur la période,
            souvent parce qu’une ancienne montre ne la mesurait pas. Stride
            s’adapte aux trous, inutile de les combler.
          </p>
        </div>
      </Widget>

      <div className="grid items-start gap-9 lg:grid-cols-2">
        <DataSection id="garmin-permissions" title="Ce que Stride peut faire">
          <DataRow
            title="Lire tes activités et données de santé"
            detail="Sans ça, rien à analyser pour te coacher."
            action={<Status level="ok">Obligatoire</Status>}
            className="[&>div:last-child]:max-md:w-auto"
          />
          <WatchToggle enabled={watch.enabled} disabled={!connected} />
        </DataSection>
        <DataSection id="garmin-history" title="Synchros récentes">
          {history.length === 0 ? (
            <p className="border-b border-border py-3 text-secondary-foreground">
              Les synchronisations apparaîtront ici après le premier import.
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.key}
                className="grid min-h-row grid-cols-[6.5rem_1fr] items-center gap-3 border-b border-border py-2.5"
              >
                <span className="text-label text-secondary-foreground tabular-nums">
                  {item.when}
                </span>
                <span>{item.text}</span>
              </div>
            ))
          )}
        </DataSection>
      </div>

      {watch.enabled && overview && (
        <section aria-labelledby="garmin-watch" className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-3 border-b border-border pb-2.5">
            <h2 id="garmin-watch" className="text-body-lg font-semibold">
              Sur ta montre · 7 prochains jours
            </h2>
            {lastWatchSend && (
              <span className="ml-auto text-label text-muted-foreground">
                Dernier envoi {lastWatchSend}
              </span>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="border-b border-border py-3 text-secondary-foreground">
              Aucune séance prévue dans les 7 prochains jours.
            </p>
          ) : (
            upcoming.map((item) => {
              const status = watchRowLabel(item.state, {
                pendingChange: item.pendingChange,
              });
              const action =
                item.state.kind === "failed" ||
                item.state.kind === "needs_confirmation"
                  ? item.copy.action
                  : null;
              return (
                <div
                  key={item.sessionKey}
                  className="grid min-h-row grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 border-b border-border py-2.5 md:grid-cols-[5.5rem_minmax(0,1fr)_auto]"
                >
                  <span className="text-label text-secondary-foreground tabular-nums">
                    {item.day}
                  </span>
                  <span className="font-medium">{item.title}</span>
                  <span className="flex flex-wrap items-center justify-start gap-2.5 max-md:col-start-2 md:justify-end">
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-label font-medium",
                        status.tone === "success" && "text-primary",
                        status.tone === "warning" && "text-warning",
                        status.tone === "danger" && "text-destructive",
                        status.tone === "muted" && "text-muted-foreground",
                      )}
                    >
                      {status.tone === "success" && (
                        <CheckIcon aria-hidden="true" className="size-3" />
                      )}
                      {status.label}
                    </span>
                    {action && (
                      <WatchRowAction
                        sessionKey={item.sessionKey}
                        action={action.kind}
                        label={action.label}
                      />
                    )}
                  </span>
                </div>
              );
            })
          )}
          <p className="pt-3 text-label text-secondary-foreground">
            Les séances arrivent dans ton calendrier Garmin sous le nom « Stride
            · … » et se lancent depuis la montre comme un entraînement guidé.
            Quand ton plan change, je remplace ou retire la séance. Je ne touche
            jamais aux entraînements que tu as créés toi-même.
          </p>
        </section>
      )}

      {!reconnect && (
        <section className="flex flex-col gap-2.5">
          {watchFailures > 0 && (
            <Banner tone="warning">
              {watchFailures === 1
                ? "1 séance n’a pas pu partir vers ta montre."
                : `${watchFailures} séances n’ont pas pu partir vers ta montre.`}{" "}
              Je réessaie au prochain passage, ou tout de suite depuis la liste.
            </Banner>
          )}
          {unavailable ? (
            <Banner tone="warning">
              Garmin ne répond pas pour le moment. On réessaie régulièrement,
              tes dernières données sont en sécurité.
            </Banner>
          ) : phase === "importing" ? (
            <Banner tone="info">
              Import de ton historique en cours. Le coaching utilise déjà ce qui
              est arrivé.
            </Banner>
          ) : phase === "attention" ? (
            <Banner tone="warning">
              Certaines données Garmin demandent ton attention. Le suivi se base
              sur ce qui est déjà arrivé.
            </Banner>
          ) : phase === "complete" && syncedAgo ? (
            <Banner tone="success">
              À jour. Dernière synchro {syncedAgo}.
            </Banner>
          ) : (
            <Banner tone="warning">
              Aucune synchronisation Garmin terminée pour le moment.
            </Banner>
          )}
        </section>
      )}
    </div>
  );

  if (reconnect) {
    return (
      <>
        <div className="flex flex-col gap-4.5 md:hidden">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-verdict font-semibold">Garmin</h1>
            <GarminStatus status={status} />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3.5">
            <p>
              La connexion Garmin a expiré
              {reconnectedLabel && (
                <>
                  {" "}
                  le <strong>{reconnectedLabel}</strong>
                </>
              )}
              . Rien de nouveau n’est arrivé depuis.
            </p>
            <p className="text-secondary-foreground">
              Ton historique est en sécurité. Je te coache avec les données
              jusque-là : le suivi de récupération est moins fiable tant que tu
              ne te reconnectes pas.
            </p>
          </div>
          <dl className="flex flex-col border-t border-border">
            {[
              { label: "Dernière activité reçue", value: lastActivity ?? "—" },
              {
                label: "Dernier sommeil et VFC",
                value: recentLabel(recent.observation?.imported_at, now) ?? "—",
              },
              {
                label: "Activités conservées",
                value: counts.activities ?? "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex min-h-row-touch items-center justify-between gap-3 border-b border-border py-2.5"
              >
                <dt className="text-secondary-foreground">{item.label}</dt>
                <dd data-slot="metric" className="font-semibold tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              disabled
              size="lg"
              title="La reconnexion depuis les réglages n’est pas encore disponible"
              className="w-full"
            >
              Reconnecter Garmin
            </Button>
            <p className="text-center text-label text-muted-foreground">
              Une seule connexion sur Garmin. Les données manquées s’importent
              automatiquement.
            </p>
          </div>
        </div>
        <div className="max-md:hidden">{desktop}</div>
      </>
    );
  }

  return desktop;
}
