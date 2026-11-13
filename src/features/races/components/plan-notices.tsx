import { CloudRainIcon, UtensilsIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Status } from "@/components/stride/status";
import type { PlanNotice } from "../plan-notices";

const icons = {
  rain: CloudRainIcon,
  fueling: UtensilsIcon,
} as const;

const links = {
  rain: { path: "/weather", label: "Voir la météo" },
  fueling: { path: "/nutrition", label: "Voir le ravitaillement" },
} as const;

export function PlanNotices({
  raceId,
  notices,
}: {
  raceId: string;
  notices: PlanNotice[];
}) {
  if (notices.length === 0) return null;
  return (
    <section
      aria-label="Ce que le plan signale"
      className="flex flex-col rounded-xl border border-border bg-card"
    >
      {notices.map((notice) => {
        const Icon = icons[notice.key];
        const link = links[notice.key];
        return (
          <article
            key={notice.key}
            aria-labelledby={`notice-${notice.key}`}
            className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2
                id={`notice-${notice.key}`}
                className="flex flex-wrap items-baseline gap-x-2 font-medium"
              >
                {notice.title}
                <Status level="watch" className="font-normal">
                  Le plan le signale
                </Status>
              </h2>
              <p className="text-pretty text-secondary-foreground">
                {notice.text}
              </p>
            </div>
            <Link
              href={`/races/${raceId}${link.path}`}
              className="shrink-0 text-label text-primary hover:text-foreground max-sm:hidden"
            >
              {link.label}
            </Link>
          </article>
        );
      })}
    </section>
  );
}
