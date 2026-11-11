import { BellIcon } from "./bell-icon";
import { cn } from "@/lib/utils";

export function NotificationEmpty({
  filtered = false,
  className,
}: {
  filtered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-10 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-lg border border-border bg-card text-secondary-foreground">
        <BellIcon className="size-4" />
      </span>
      <h2 className="text-body-lg font-semibold">
        {filtered ? "Rien dans ce filtre" : "Tu es à jour"}
      </h2>
      <p className="max-w-80 text-secondary-foreground">
        {filtered
          ? "Aucune notification de ce type sur les 30 derniers jours."
          : "Les messages du staff, les imports Garmin et les changements de ton plan arriveront ici."}
      </p>
    </div>
  );
}
