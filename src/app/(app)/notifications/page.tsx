import type { Metadata } from "next";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { MarkAllRead } from "@/features/notifications/components/mark-all-read";
import { NotificationEmpty } from "@/features/notifications/components/notification-empty";
import { NotificationFilters } from "@/features/notifications/components/notification-filters";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { parseFilter, unreadLabel } from "@/features/notifications/model";
import { requireAthlete } from "@/server/app/session";
import {
  countTodo,
  countUnread,
  readNotifications,
} from "@/server/notifications/feed";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const filter = parseFilter(query.filter);
  const now = new Date();
  const [notifications, unread, todo] = await Promise.all([
    readNotifications(context, { filter, now }),
    countUnread(context, now),
    countTodo(context, now),
  ]);
  return (
    <>
      <AppHeader title="Notifications" />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 md:px-5">
              <h1 className="font-semibold max-md:sr-only">Notifications</h1>
              <span className="text-label text-muted-foreground max-md:hidden xl:hidden">
                30 derniers jours
              </span>
              <NotificationFilters current={filter} todo={todo} />
              {unread > 0 && (
                <>
                  <span className="text-label text-primary md:hidden">
                    {unreadLabel(unread)}
                  </span>
                  <MarkAllRead
                    label="Tout lire"
                    className="-mr-2 ml-auto min-h-control-touch md:hidden"
                  />
                  <MarkAllRead
                    variant="outline"
                    className="ml-auto max-md:hidden"
                  />
                </>
              )}
            </div>
            {notifications.length ? (
              <NotificationList
                notifications={notifications}
                now={now.toISOString()}
                withDate
              />
            ) : (
              <NotificationEmpty
                filtered={filter !== "all"}
                className="flex-1 pt-24"
              />
            )}
          </div>
          <aside
            aria-label="30 derniers jours"
            className="flex flex-col gap-2.5 px-4 py-4.5 max-xl:hidden md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
          >
            <h2 className="text-label font-medium text-muted-foreground">
              30 derniers jours
            </h2>
            <dl className="flex flex-col">
              <div className="flex items-baseline justify-between border-b border-border py-2">
                <dt className="text-secondary-foreground">Non lues</dt>
                <dd className="font-semibold tabular-nums">{unread}</dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-border py-2">
                <dt className="text-secondary-foreground">À traiter</dt>
                <dd className="font-semibold tabular-nums">{todo}</dd>
              </div>
            </dl>
            <p className="text-label text-muted-foreground">
              Ce que le staff, Garmin et ton plan ont fait pendant que tu
              courais.
            </p>
          </aside>
        </main>
      </div>
    </>
  );
}
