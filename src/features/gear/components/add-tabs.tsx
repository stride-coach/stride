import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "name", label: "Par son nom", href: "/activities/gear/new" },
  { key: "garmin", label: "Depuis Garmin", href: "/activities/gear/import" },
] as const;

export function AddTabs({
  current,
}: {
  current: (typeof tabs)[number]["key"];
}) {
  return (
    <nav
      aria-label="Façon d’ajouter"
      className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5 max-sm:w-full"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "flex min-h-control-touch flex-1 items-center justify-center rounded-md px-2.5 text-center whitespace-nowrap transition-colors duration-150 ease-stride md:min-h-6",
            tab.key === current
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
