import Link from "next/link";

// Schmale Leiste ganz oben, solange ein Helfer angemeldet ist (siehe
// lib/nutzer.ts): wer gerade angemeldet ist, und bei "Nur lesen" der Hinweis,
// warum es keine Knöpfe zum Ändern gibt. Gilt in allen Designs.
export function HelferLeiste({ name, nurLesen }: { name: string; nurLesen: boolean }) {
  return (
    <div className="border-b border-border bg-flaeche print:hidden">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 px-4 py-1 text-center text-xs text-muted">
        <span>
          Angemeldet als <span className="font-medium text-foreground">{name}</span>
        </span>
        {nurLesen && (
          <span className="rounded-full border border-rand-ruhig px-2 py-px font-medium text-foreground">
            Nur lesen
          </span>
        )}
        <Link href="/einstellungen/passwort" className="underline underline-offset-2 hover:text-accent">
          Passwort ändern
        </Link>
      </p>
    </div>
  );
}
