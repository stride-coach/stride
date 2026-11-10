import { cn } from "@/lib/utils";

export function Widget({
  title,
  headingLevel = 3,
  icon,
  verdict,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode;
  headingLevel?: 2 | 3 | 4;
  icon?: React.ReactNode;
  verdict?: React.ReactNode;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section
      data-slot="widget"
      className={cn(
        "rounded-xl border border-border bg-muted px-1 pb-1",
        className,
      )}
      {...props}
    >
      <header className="flex h-row items-center gap-2 px-2.5 font-medium text-secondary-foreground">
        {icon && (
          <span aria-hidden="true" className="[&_svg]:size-4">
            {icon}
          </span>
        )}
        <Heading className="min-w-0 truncate text-body font-medium">
          {title}
        </Heading>
        {verdict && <span className="ml-auto">{verdict}</span>}
      </header>
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        {children}
      </div>
    </section>
  );
}
