import { ImageResponse } from "next/og";
import { appIconColors } from "@/components/stride/stride-logo";

const { tile, upper, lower } = appIconColors;

export function appIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: tile,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <g transform="translate(11.5 11.5) scale(1.28)">
          <rect x="10" y="7" width="18" height="7.5" rx="1.5" fill={upper} />
          <rect x="4" y="17.5" width="18" height="7.5" rx="1.5" fill={lower} />
        </g>
      </svg>
    </div>,
    { width: size, height: size },
  );
}
