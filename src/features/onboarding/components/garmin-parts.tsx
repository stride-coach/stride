import { LockIcon } from "lucide-react";
import { SourceMark } from "@/components/stride/marks";
import { cn } from "@/lib/utils";

type StageStatus = "done" | "current" | "upcoming";

export function ConnectStages({
  statuses,
  optionalVerification = false,
}: {
  statuses: [StageStatus, StageStatus, StageStatus];
  optionalVerification?: boolean;
}) {
  const labels = [
    "Connexion",
    <>
      Vérification
      {optionalVerification && (
        <span className="hidden lg:inline"> si besoin</span>
      )}
    </>,
    "Connecté",
  ];
  return (
    <ol
      aria-label="Progression de la connexion Garmin"
      className="flex flex-wrap items-center gap-2 text-label tabular-nums"
    >
      {labels.map((label, index) => {
        const status = statuses[index];
        return (
          <li
            key={index}
            aria-current={status === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5",
              status === "done" && "text-secondary-foreground",
              status === "current" && "font-medium text-foreground",
              status === "upcoming" && "text-muted-foreground",
            )}
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className="mr-1 h-px w-4 bg-control-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "size-3 shrink-0 rounded-full border-[1.5px]",
                status === "done" && "border-primary bg-primary",
                status === "current" &&
                  "border-warning bg-[linear-gradient(90deg,transparent_50%,var(--warning)_50%)]",
                status === "upcoming" && "border-muted-foreground",
              )}
            />
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function GarminNoticeBox({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 rounded-lg border border-control-border bg-card px-3.5 py-3"
    >
      <span
        aria-hidden="true"
        className="mt-1.5 size-1.5 rounded-full bg-warning"
      />
      <p className="font-medium">{title}</p>
      {children && (
        <div className="col-start-2 text-body text-secondary-foreground">
          {children}
        </div>
      )}
    </div>
  );
}

export function SecureNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-label text-secondary-foreground">
      <LockIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function ReadOnlyNote() {
  return (
    <p className="flex items-center gap-2 text-label text-muted-foreground">
      <SourceMark source="provider" />
      Lecture seule. Stride ne publie jamais sur Garmin.
    </p>
  );
}

export function AsideList({
  title,
  items,
  numbered = false,
}: {
  title: string;
  items: { title?: string; body: string }[];
  numbered?: boolean;
}) {
  return (
    <section aria-label={title} className="flex flex-col">
      <h2 className="border-b border-border pb-2 text-label font-medium text-muted-foreground">
        {title}
      </h2>
      <ol>
        {items.map((item, index) => (
          <li
            key={item.title ?? item.body}
            className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-border py-2.5"
          >
            {numbered ? (
              <span className="font-semibold text-muted-foreground tabular-nums">
                {index + 1}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <span className="flex flex-col gap-0.5">
              {item.title && <span className="font-medium">{item.title}</span>}
              <span className="text-label text-secondary-foreground">
                {item.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StepLayout({
  aside,
  centered = false,
  children,
}: {
  aside?: React.ReactNode;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-10",
        centered && "lg:justify-center",
      )}
    >
      <div className="flex flex-1 flex-col gap-6 motion-safe:animate-rise">
        {children}
      </div>
      {aside && (
        <aside className="hidden flex-col gap-6 lg:flex">{aside}</aside>
      )}
    </div>
  );
}

export function StepHeading({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-verdict font-semibold text-balance">{title}</h1>
      {children && (
        <p className="text-body-lg text-pretty text-secondary-foreground">
          {children}
        </p>
      )}
    </div>
  );
}
