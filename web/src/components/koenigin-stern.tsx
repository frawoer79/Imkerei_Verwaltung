import { IconStern } from "@/components/icons";

// Gelber Stern für herausragende Königinnen. Klein und ohne Beschriftung,
// damit er neben der Kennung überall mitlaufen kann; gesetzt wird er nur
// auf der Seite der Königin (siehe KoeniginSternKnopf).
export const STERN_FARBE = "text-yellow-400 dark:text-yellow-300";

export function KoeniginStern({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className="-my-2 inline-flex shrink-0 align-middle" title="Herausragende Königin" role="img" aria-label="Stern">
      <IconStern gefuellt className={`${className} ${STERN_FARBE}`} />
    </span>
  );
}

/// Schalter auf der Seite der Königin. Aktiv: gelb gefüllt, inaktiv: Umriss.
export function KoeniginSternKnopf({ aktiv, action }: { aktiv: boolean; action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        data-schreibt-gesperrt
        type="submit"
        aria-pressed={aktiv}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          aktiv
            ? "border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-500/60 dark:bg-yellow-950/40 dark:text-yellow-200"
            : "border-border bg-card text-muted hover:border-yellow-400 hover:text-foreground"
        }`}
        title={aktiv ? "Stern entfernen" : "Als herausragende Königin markieren"}
      >
        <IconStern gefuellt={aktiv} className={`h-5 w-5 ${aktiv ? STERN_FARBE : ""}`} />
        {aktiv ? "Mit Stern markiert" : "Stern vergeben"}
      </button>
    </form>
  );
}
