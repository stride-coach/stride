import { cn } from "@/lib/utils";

export const appIconColors = {
  tile: "#2456E6",
  upper: "#FFFFFF",
  lower: "#A9C3FF",
} as const;

export function StrideLogo({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      <rect
        x="10"
        y="7"
        width="18"
        height="7.5"
        rx="1.5"
        className="fill-foreground"
      />
      <rect
        x="4"
        y="17.5"
        width="18"
        height="7.5"
        rx="1.5"
        className="fill-primary"
      />
    </svg>
  );
}

export function StrideAppIcon({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-9.5 shrink-0", className)}
      {...props}
    >
      <rect width="64" height="64" rx="14.4" fill={appIconColors.tile} />
      <g transform="translate(11.5 11.5) scale(1.28)">
        <rect
          x="10"
          y="7"
          width="18"
          height="7.5"
          rx="1.5"
          fill={appIconColors.upper}
        />
        <rect
          x="4"
          y="17.5"
          width="18"
          height="7.5"
          rx="1.5"
          fill={appIconColors.lower}
        />
      </g>
    </svg>
  );
}
