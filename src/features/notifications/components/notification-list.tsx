"use client";

import { CheckIcon, RefreshCwIcon, WatchIcon } from "lucide-react";
import type { ComponentType } from "react";
import {
  NavActivitiesIcon,
  NavGearIcon,
  NavPlanIcon,
} from "@/components/stride/nav-icons";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { staff as allStaff } from "@/features/coach/staff";
import { openNotification } from "@/server/notifications/actions";
import { cn } from "@/lib/utils";
import {
  groupByDay,
  notificationView,
  type Notification,
  type NotificationFamily,
  type NotificationStatus,
  type NotificationView,
} from "../model";

const familyIcons: Record<
  Exclude<NotificationFamily, "staff">,
  ComponentType<{ className?: string }>
> = {
  plan: NavPlanIcon,
  activity: NavActivitiesIcon,
  sync: RefreshCwIcon,
  watch: WatchIcon,
  shoe: NavGearIcon,
};

function NotificationIcon({ view }: { view: NotificationView }) {
  if (view.agent)
    return <StaffAvatar agent={view.agent} size={30} decorative />;
  const Icon = familyIcons[view.family === "staff" ? "plan" : view.family];
  return (
    <span
      aria-hidden="true"
      className="grid size-7.5 place-items-center rounded-md border border-border bg-card text-secondary-foreground"
    >
      <Icon className="size-3.5" />
    </span>
  );
}

function StatusMark({ status }: { status: NotificationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-medium",
        status.tone === "warning" && "text-warning",
        status.tone === "success" && "text-primary",
        status.tone === "muted" && "text-muted-foreground",
      )}
    >
      {status.tone === "success" ? (
        <CheckIcon aria-hidden="true" className="size-3" strokeWidth={2.5} />
      ) : (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {status.label}
    </span>
  );
}

const actionClass =
  "inline-flex min-h-control-touch items-center justify-center rounded-md border border-control-border bg-card px-2.5 font-medium whitespace-nowrap text-foreground transition-colors duration-150 ease-stride hover:border-muted-foreground md:min-h-control";

function NotificationRow({ view }: { view: NotificationView }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <form
        action={openNotification}
        className="grid grid-cols-[6px_30px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 px-4 py-3 transition-colors duration-150 ease-stride hover:bg-muted md:px-5"
      >
        <input type="hidden" name="id" value={view.id} />
        <span className="flex h-7.5 items-center">
          {view.unread && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Non lue</span>
            </span>
          )}
        </span>
        <NotificationIcon view={view} />
        <button
          type="submit"
          className="flex min-w-0 flex-col gap-0.5 rounded-md text-left"
        >
          <span
            className={cn(
              "font-medium",
              view.unread ? "text-foreground" : "text-secondary-foreground",
            )}
          >
            {view.title}
          </span>
          {view.body && (
            <span className="line-clamp-3 text-label text-secondary-foreground">
              {view.body}
            </span>
          )}
        </button>
        <span className="flex items-center gap-2.5 pt-0.5">
          <time
            dateTime={view.occurredAt}
            className="text-label whitespace-nowrap text-muted-foreground tabular-nums"
          >
            {view.time}
          </time>
          {view.action && (
            <button type="submit" className={cn(actionClass, "max-md:hidden")}>
              {view.action}
            </button>
          )}
        </span>
        {(view.action || view.status) && (
          <span className="col-span-2 col-start-3 flex flex-wrap items-center gap-2.5">
            {view.action && (
              <button type="submit" className={cn(actionClass, "md:hidden")}>
                {view.action}
              </button>
            )}
            {view.status && <StatusMark status={view.status} />}
          </span>
        )}
      </form>
    </li>
  );
}

export function NotificationList({
  notifications,
  now,
  withDate = false,
}: {
  notifications: readonly Notification[];
  now: string;
  withDate?: boolean;
}) {
  const staff = allStaff;
  const days = groupByDay(
    notifications.map((notification) => notificationView(notification, staff)),
    new Date(now),
    { withDate },
  );
  return (
    <div>
      {days.map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h3 className="border-b border-border bg-muted px-4 py-2 text-label font-medium text-secondary-foreground tabular-nums md:px-5">
            {day.label}
          </h3>
          <ul>
            {day.items.map((view) => (
              <NotificationRow key={view.id} view={view} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
