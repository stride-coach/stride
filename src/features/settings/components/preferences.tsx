import { cn } from "@/lib/utils";

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
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card md:overflow-visible md:rounded-none md:border-0 md:bg-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PreferenceSection({
  title,
  description,
  id,
  grouped = true,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  id?: string;
  grouped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-2 md:gap-0">
      <div className="flex flex-col gap-0.5 px-1 md:border-b md:border-border md:px-0 md:pb-2.5">
        <h2 className="text-body-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-body text-secondary-foreground">{description}</p>
        )}
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
    <div className="flex min-h-row flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6 md:px-0 md:py-3.5 md:last:border-b">
      <div className="flex flex-col gap-0.5">
        <span id={labelId} className="font-medium">
          {label}
        </span>
        {hint && (
          <span className="text-label text-secondary-foreground">{hint}</span>
        )}
      </div>
      <div className="md:justify-self-end">{children}</div>
    </div>
  );
}

export const segmentGroup =
  "flex w-full gap-0.5 rounded-lg border border-border bg-card p-0.5 md:w-fit";

export const segmentItem =
  "inline-flex min-h-control-touch w-full items-center justify-center rounded-md px-2.5 whitespace-nowrap text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground md:min-h-6";

export const segmentChecked =
  "peer-checked:bg-muted peer-checked:font-medium peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-ring";

const chip =
  "inline-flex min-h-control-touch items-center rounded-md border border-control-border px-2.5 whitespace-nowrap text-secondary-foreground transition-colors duration-150 ease-stride md:min-h-6 peer-checked:border-transparent peer-checked:bg-accent peer-checked:font-medium peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-ring";

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
  if (type === "checkbox")
    return (
      <div
        role="group"
        aria-labelledby={labelledBy}
        className="flex flex-wrap gap-1.5 md:justify-end"
      >
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              className="peer sr-only"
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
            />
            <span className={chip}>{option.label}</span>
          </label>
        ))}
      </div>
    );
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={cn(segmentGroup, !stretch && "w-fit")}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn("cursor-pointer", stretch && "max-md:flex-1")}
        >
          <input
            className="peer sr-only"
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
          />
          <span className={cn(segmentItem, segmentChecked)}>
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
      className="flex justify-between gap-1.5 md:justify-end"
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
            className="grid size-control-touch place-items-center rounded-md border border-control-border font-medium text-muted-foreground transition-colors duration-150 ease-stride peer-checked:border-primary peer-checked:bg-accent peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-ring md:size-control"
          >
            {day.short}
          </span>
        </label>
      ))}
    </div>
  );
}
