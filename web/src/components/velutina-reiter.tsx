import Link from "next/link";

// Velutina-Seite mit zwei Reitern wie bei den Königinnen: "Meldungen" (LUBW-
// Karte und Bereiche um die Stände) und "Nestsuche" (Locktopf-Peilungen).
// Hier als Links, weil beide Reiter eigene Seiten sind.
export function VelutinaReiter({ aktiv, anzahlSuchen }: { aktiv: "meldungen" | "nestsuche"; anzahlSuchen?: number }) {
  const klasse = (wert: "meldungen" | "nestsuche") =>
    `flex items-baseline justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
      aktiv === wert ? "bg-card text-foreground shadow-sm" : "text-muted"
    }`;
  return (
    <nav aria-label="Velutina" className="-mt-2 grid grid-cols-2 gap-1 rounded-lg bg-border p-1 sm:max-w-sm">
      <Link href="/velutina" className={klasse("meldungen")} aria-current={aktiv === "meldungen" ? "page" : undefined}>
        Meldungen
      </Link>
      <Link
        href="/velutina/nestsuche"
        className={klasse("nestsuche")}
        aria-current={aktiv === "nestsuche" ? "page" : undefined}
      >
        Nestsuche
        {anzahlSuchen ? <span className="text-xs font-normal text-muted">{anzahlSuchen}</span> : null}
      </Link>
    </nav>
  );
}
