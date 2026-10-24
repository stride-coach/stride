import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";

const sections = [
  { href: "#prevention", label: "Prévention" },
  { href: "#sante", label: "Données santé" },
  { href: "#staff", label: "Le staff" },
  { href: "#comment", label: "Comment ça marche" },
] as const;

export function PublicWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Stride, accueil"
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-control text-foreground md:gap-2.5",
        className,
      )}
    >
      <StrideMark className="size-5 md:size-5.5" strokeWidth="2.2" />
      <span className="font-metric text-xl font-bold tracking-wider italic md:text-[22px]">
        STRIDE
      </span>
    </Link>
  );
}

export function PublicHeader({ withSections = false }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-background">
      <div className="mx-auto flex h-15 max-w-300 items-center gap-8 pr-2 pl-4 md:h-17 md:px-10">
        <PublicWordmark />
        {withSections && (
          <nav aria-label="Sections" className="hidden gap-6.5 text-sm lg:flex">
            {sections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-control text-muted hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/sign-in"
            className="rounded-control p-3 text-[15px] text-foreground hover:text-accent md:px-2.5 md:text-sm"
          >
            Se connecter
          </Link>
          <Button asChild size="md" className="hidden md:inline-flex">
            <Link href="/sign-up">Créer un compte</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
