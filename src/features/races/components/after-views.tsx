import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";

export function AfterViews({
  base,
  current,
}: {
  base: string;
  current: "race" | "compare";
}) {
  const items = [
    { key: "race", href: `${base}/after`, label: "Cette course" },
    { key: "compare", href: `${base}/after/compare`, label: "Comparer" },
  ] as const;
  return (
    <nav
      aria-label="Vues de l’après-course"
      className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-control-touch items-center rounded-md px-3 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground md:min-h-7",
            item.key === current && "bg-muted font-medium text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
