import { cn } from "@/lib/utils";

const segment =
  "inline-flex min-h-11 items-center rounded-md border border-border-strong bg-muted px-3 text-sm text-secondary-foreground md:min-h-9.5 md:bg-card";

export function PreferenceGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card md:overflow-visible md:rounded-none md:border-0 md:bg-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PreferenceSection({
  title,
  id,
  grouped = true,
  children,
}: {
  title: string;
  id?: string;
  grouped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-2 md:gap-0">
      <div className="px-1.5 md:border-b md:border-border-strong md:px-0 md:pb-2.5">
        <h2 className="font-mono text-micro tracking-wider text-secondary-foreground uppercase md:text-label">
          {title}
        </h2>
      </div>
      {grouped ? <PreferenceGroup>{children}</PreferenceGroup> : children}
    </section>
  );
}

export function PreferenceRow({
  labelId,
  label,
  hint,
  children,
}: {
  labelId: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid md:grid-cols-[13.75rem_minmax(0,1fr)] md:items-center md:gap-x-6 md:gap-y-2.5 md:px-0 md:py-4">
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="text-body md:text-sm">
          {label}
        </span>
        {hint && (
          <span className="text-xs leading-snug text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function SegmentedField({
  name,
  type = "radio",
  options,
  selected,
  labelledBy,
  stretch = false,
}: {
  name: string;
  type?: "radio" | "checkbox";
  options: { value: string; label: string }[];
  selected: string[];
  labelledBy: string;
  stretch?: boolean;
}) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn("cursor-pointer", stretch && "max-md:flex-1")}
        >
          <input
            className="peer sr-only"
            type={type}
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
          />
          <span
            className={cn(
              segment,
              stretch && "max-md:w-full max-md:justify-center",
              "peer-checked:border-foreground peer-checked:bg-foreground peer-checked:font-semibold peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function WeekdayField({
  name,
  days,
  selected,
  labelledBy,
}: {
  name: string;
  days: { value: number; short: string; label: string }[];
  selected: number[];
  labelledBy: string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex justify-between gap-1.5 md:justify-start"
    >
      {days.map((day) => (
        <label key={day.value} className="cursor-pointer">
          <input
            className="peer sr-only"
            type="checkbox"
            name={name}
            value={day.value}
            aria-label={day.label}
            defaultChecked={selected.includes(day.value)}
          />
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-full border border-border-strong bg-muted text-xs font-semibold text-muted-foreground peer-checked:border-primary peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-ring md:size-10 md:bg-card"
          >
            {day.short}
          </span>
        </label>
      ))}
    </div>
  );
}
