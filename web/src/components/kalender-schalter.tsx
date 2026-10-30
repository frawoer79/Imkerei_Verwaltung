import { IconKalender } from "@/components/icons";

// Kleiner Umschalter, ob eine Maßnahme im Kalender-Abo erscheint. Aktiv:
// gefüllt in Akzentfarbe, inaktiv: blasser Umriss.
export function KalenderSchalter({ aktiv, action }: { aktiv: boolean; action: () => Promise<void> }) {
  return (
    <form action={action} className="shrink-0">
      <button
        type="submit"
        aria-pressed={aktiv}
        title={aktiv ? "Steht im Kalender. Antippen zum Herausnehmen." : "Nicht im Kalender. Antippen zum Aufnehmen."}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
          aktiv
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-card text-muted hover:border-accent hover:text-foreground"
        }`}
      >
        <IconKalender className="h-4 w-4" />
        <span className="hidden sm:inline">{aktiv ? "Kalender" : "kein Kalender"}</span>
      </button>
    </form>
  );
}
