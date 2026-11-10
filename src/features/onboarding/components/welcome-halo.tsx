import { Halo } from "@/components/stride/halo";

export function WelcomeHalo() {
  return (
    <>
      <Halo
        viewBox="0 0 1160 984"
        preserveAspectRatio="xMaxYMin meet"
        path="M520,1040 C640,900 700,860 800,800 S900,600 960,500 S1060,300 1200,140"
        pool={{ cx: 998, cy: 118, r: 640 }}
        width={170}
        className="absolute inset-0 -z-10 hidden size-full xl:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden bg-linear-to-r from-background/95 via-background/70 via-55% to-transparent to-80% xl:block"
      />
      <Halo
        viewBox="0 0 390 320"
        preserveAspectRatio="xMaxYMin slice"
        path="M170,130 C240,118 285,92 320,60 S372,6 410,-14"
        pool={{ cx: 351, cy: 64, r: 273 }}
        width={80}
        trace={false}
        scrim="bottom"
        surface="inset"
        className="absolute -top-6 -right-5 -z-10 h-80 w-97.5 lg:hidden"
      />
    </>
  );
}
