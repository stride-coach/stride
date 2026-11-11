import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";

const sections = [
  { href: "#comment", label: "Comment ça marche" },
  { href: "#staff", label: "Le staff" },
] as const;

function PublicWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Stride, accueil"
      className={cn(
        "inline-flex min-h-control-touch w-fit items-center gap-2 rounded-md font-semibold text-foreground md:min-h-control",
        className,
      )}
    >
      <StrideMark className="size-4.5 stroke-primary" />
      Stride
    </Link>
  );
}

export function PublicHeader({ withSections = false }) {
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-15 max-w-300 items-center gap-6 px-4 md:px-10">
        <PublicWordmark />
        <div className="ml-auto flex items-center gap-2">
          {withSections && (
            <nav
              aria-label="Sections"
              className="mr-2 hidden items-center gap-6 lg:flex"
            >
              {sections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="rounded-md font-medium text-secondary-foreground hover:text-foreground"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          )}
          <Button asChild variant="outline">
            <Link href="/sign-in">Se connecter</Link>
          </Button>
          <Button asChild className="max-md:hidden">
            <Link href="/sign-up">Créer un compte</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
