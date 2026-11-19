import { ChartNoAxesColumnIcon } from "lucide-react";
import { Status } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import type { LoadTrend } from "../load-trend";

export function LoadTrendWidget({ load }: { load: LoadTrend }) {
  return (
    <Widget
      headingLevel={2}
      icon={<ChartNoAxesColumnIcon />}
      title="Charge · 12 sem."
      verdict={<Status level={load.level}>{load.label}</Status>}
    >
      <svg
        viewBox="0 0 260 84"
        role="img"
        aria-label={load.description}
        className="block w-full"
      >
        <polygon points={load.band} className="fill-accent" />
        <polyline
          points={load.line}
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="stroke-foreground"
        />
        {load.peak && (
          <circle
            cx={load.peak.x}
            cy={load.peak.y}
            r="3.5"
            strokeWidth="1.5"
            className="fill-warning stroke-background"
          />
        )}
        <circle
          cx={load.current.x}
          cy={load.current.y}
          r="3.5"
          strokeWidth="1.5"
          className="fill-foreground stroke-background"
        />
      </svg>
    </Widget>
  );
}
