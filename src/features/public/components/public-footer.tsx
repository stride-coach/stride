import Link from "next/link";
import { legalPages, publisher } from "@/features/public/publisher";

function LegalLinks() {
  return (
    <nav
      aria-label="Informations légales"
      className="flex flex-col md:ml-auto md:flex-row md:flex-wrap md:gap-4"
    >
      {legalPages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className="inline-flex min-h-control-touch items-center rounded-md text-secondary-foreground hover:text-foreground md:min-h-control"
        >
          {page.label}
        </Link>
      ))}
      <a
        href={`mailto:${publisher.email}`}
        className="inline-flex min-h-control-touch items-center rounded-md text-secondary-foreground hover:text-foreground md:min-h-control"
      >
        Contact
      </a>
    </nav>
  );
}

export function PublicFooter({ withDisclaimer = false }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-300 flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:gap-8 md:px-10">
        {withDisclaimer ? (
          <p className="max-w-150 text-label text-muted-foreground">
            Stride est un outil d’entraînement, pas un dispositif médical. Il ne
            pose aucun diagnostic. En cas de douleur persistante ou de symptôme
            inhabituel, consulte un professionnel de santé. Garmin est une
            marque de Garmin Ltd. ou de ses filiales. © 2026 Stride.
          </p>
        ) : (
          <p className="text-label text-muted-foreground">© 2026 Stride</p>
        )}
        <LegalLinks />
      </div>
    </footer>
  );
}
