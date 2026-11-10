import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";

export const segmentGroupClass =
  "flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.5 max-sm:w-full";

export const segmentItemClass =
  "flex min-h-control-touch items-center justify-center rounded-md px-2.5 whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground max-sm:flex-1 md:min-h-6";

export const segmentCurrentClass = "bg-muted font-medium text-foreground";

export function HealthPage({
  aside,
  children,
}: {
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {aside && (
        <aside
          aria-label="Repères"
          className="flex flex-col px-4 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
        >
          {aside}
        </aside>
      )}
    </div>
  );
}

export function HealthReading({
  kicker,
  title,
  children,
  actions,
}: {
  kicker: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2.5 border-b border-border px-4 py-4.5 md:px-5">
      <p className="flex items-center gap-2 text-label text-secondary-foreground">
        <StrideMark className="size-3 shrink-0" />
        {kicker}
      </p>
      <h1 className="max-w-160 text-verdict font-semibold text-balance">
        {title}
      </h1>
      {children && (
        <div className="max-w-170 text-body-lg text-pretty text-secondary-foreground">
          {children}
        </div>
      )}
      {actions && (
        <div className="mt-1 flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function HealthGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid items-start gap-3 px-4 py-4.5 md:px-5 lg:grid-cols-2",
        className,
      )}
      {...props}
    />
  );
}

export function PanelSection({
  title,
  meta,
  id,
  className,
  children,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-2.5 border-b border-border py-4.5 last:border-b-0",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-label font-medium text-muted-foreground">
          {title}
        </h2>
        {meta && (
          <span className="text-label text-muted-foreground">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export function WidgetEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-muted-foreground">{children}</p>;
}
