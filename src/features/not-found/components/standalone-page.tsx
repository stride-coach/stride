import Link from "next/link";
import { Relief } from "@/components/stride/relief";
import { StrideLogo } from "@/components/stride/stride-logo";

function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="Stride, accueil"
      className="relative z-10 inline-flex min-h-control-touch w-fit items-center gap-2 rounded-md font-semibold text-foreground md:min-h-0"
    >
      <StrideLogo />
      Stride
    </Link>
  );
}

export function StandalonePage({
  label,
  title,
  message,
  alert = false,
  children,
}: {
  label: string;
  title: string;
  message: string;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      lang="fr"
      className="relative flex min-h-svh flex-col overflow-hidden bg-background px-4 pt-4 pb-8 md:px-8 md:pt-6"
    >
      <Relief corner="top-right" className="max-md:hidden" />
      <Relief corner="bottom-left" />
      <Wordmark />
      <section
        role={alert ? "alert" : undefined}
        aria-labelledby="standalone-title"
        className="relative z-10 mx-auto flex w-full max-w-110 flex-1 flex-col justify-center gap-2.5 md:items-center md:text-center"
      >
        <p className="text-label text-muted-foreground">{label}</p>
        <h1 id="standalone-title" className="text-verdict font-semibold">
          {title}
        </h1>
        <p className="text-body-lg text-pretty text-secondary-foreground">
          {message}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-8 md:mt-2 md:flex-row md:flex-wrap md:justify-center md:pt-0">
          {children}
        </div>
      </section>
    </main>
  );
}
