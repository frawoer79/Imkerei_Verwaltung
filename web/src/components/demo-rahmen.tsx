import Link from "next/link";
import { IconCode, IconLogo } from "@/components/icons";
import { REPOSITORY_URL } from "@/lib/demo";

// Rahmen der öffentlichen Seiten der Demo (Startseite, Impressum,
// Datenschutz), wenn noch kein Demo-Platz belegt ist: Logo, Inhalt, und unten
// der Link zum Quellcode samt Impressum und Datenschutz.
export function DemoRahmen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-background px-4 py-10">
      <Link href="/demo" className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <IconLogo className="h-8 w-8 text-accent" />
        Imkereiverwaltung
      </Link>
      <RepositoryLink className="mb-6 -mt-3 text-sm" />
      <div className="w-full max-w-xl flex-1">{children}</div>
      <DemoFussLinks />
    </div>
  );
}

export function RepositoryLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={REPOSITORY_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 font-medium text-accent underline underline-offset-2 hover:opacity-80 ${className}`}
    >
      <IconCode className="h-5 w-5 shrink-0" />
      Quellcode und Installation auf GitHub
    </a>
  );
}

export function DemoFussLinks() {
  return (
    <p className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
      <Link href="/impressum" className="underline underline-offset-2 hover:text-accent">
        Impressum
      </Link>
      <Link href="/datenschutz" className="underline underline-offset-2 hover:text-accent">
        Datenschutz
      </Link>
    </p>
  );
}

// Impressum und Datenschutz: ohne Platz im Rahmen der Startseite, mit Platz
// mitten in der App (deren Layout liefert dann Menü und Leiste).
export function DemoTextSeite({ angemeldet, children }: { angemeldet: boolean; children: React.ReactNode }) {
  const inhalt = <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-accent [&_a]:underline">{children}</div>;
  return angemeldet ? <div className="mx-auto max-w-3xl">{inhalt}</div> : <DemoRahmen>{inhalt}</DemoRahmen>;
}
