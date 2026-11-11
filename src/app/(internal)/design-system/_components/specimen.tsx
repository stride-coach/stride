import { cn } from "@/lib/utils";
import { MonoLabel } from "@/components/stride/mono-label";

export function GallerySection({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string;
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-8 flex-col gap-8 border-t border-border pt-10"
    >
      <header className="flex max-w-3xl flex-col gap-2">
        <MonoLabel tone="accent">{index}</MonoLabel>
        <h2 id={`${id}-title`} className="text-verdict font-semibold">
          {title}
        </h2>
        {description && (
          <p className="text-body text-pretty text-secondary-foreground">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function Specimen({
  title,
  meta,
  className,
  children,
}: {
  title: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-body-lg font-semibold text-balance">{title}</h3>
        {meta && (
          <span className="shrink-0 text-right text-label text-muted-foreground max-sm:hidden">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
