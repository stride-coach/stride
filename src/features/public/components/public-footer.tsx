import Link from "next/link";
import { legalPages, publisher } from "@/features/public/publisher";
import { PublicWordmark } from "./public-header";

function LegalLinks() {
  return (
    <nav
      aria-label="Informations légales"
      className="flex flex-col text-[15px] md:ml-auto md:flex-row md:flex-wrap md:gap-5 md:text-sm"
    >
      {legalPages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className="rounded-control py-2.75 text-muted hover:text-foreground md:py-1.5"
        >
          {page.label}
        </Link>
      ))}
      <a
        href={`mailto:${publisher.email}`}
        className="rounded-control py-2.75 text-muted hover:text-foreground md:py-1.5"
      >
        Contact
      </a>
    </nav>
  );
}

export function PublicFooter({ withDisclaimer = false }) {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-300 flex-col gap-5 px-4 pt-7 pb-10 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <PublicWordmark className="hidden md:inline-flex" />
          <LegalLinks />
        </div>
        {withDisclaimer ? (
          <p className="max-w-205 text-xs leading-relaxed text-muted-foreground">
            Stride est un outil d’entraînement, pas un dispositif médical. Il ne
            pose aucun diagnostic. En cas de douleur persistante ou de symptôme
            inhabituel, consulte un professionnel de santé. Garmin est une
            marque de Garmin Ltd. ou de ses filiales. © 2026 {publisher.name}.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            © 2026 {publisher.name}
          </p>
        )}
      </div>
    </footer>
  );
}
