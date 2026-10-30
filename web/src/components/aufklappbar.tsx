// Aufklappbarer Abschnitt für lange Formulare (z.B. die Stockkarte), gebaut
// auf dem nativen <details>/<summary> - kein eigener Zustand/Client-Code
// nötig, funktioniert also auch als reiner Server-Komponenten-Baustein.
export function Aufklappbar({
  titel,
  symbol,
  hinweis,
  startOffen = false,
  children,
}: {
  titel: string;
  symbol: React.ReactNode;
  // Ein Satz darüber, was in diesem Abschnitt dokumentiert wird. Steht
  // aufgeklappt über dem ersten Eingabefeld, damit man beim Öffnen sofort
  // weiß, was hierher gehört.
  hinweis?: string;
  startOffen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={startOffen} className="group rounded-md border border-rand-ruhig">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-muted">{symbol}</span>
          {titel}
        </span>
        <span className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-3">
        {hinweis && (
          <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted">
            {hinweis}
          </p>
        )}
        {children}
      </div>
    </details>
  );
}
