// Gemeinsame Optik der vier Knöpfe in der Volkskachel (Bearbeiten, Umziehen,
// QR-Code, Status): Symbol über dem Wort, gleich breit nebeneinander. Als
// Konstante, weil die Knöpfe teils <Link>, teils <button> in eigenen
// Dialog-Komponenten sind.
export const AKTION_KACHEL =
  "flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-1 py-2 text-xs font-medium transition-colors hover:bg-background disabled:opacity-50";
export const AKTION_SYMBOL = "h-5 w-5 text-accent";
