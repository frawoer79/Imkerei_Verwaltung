import { standPinSvg } from "@/lib/leaflet-icons";

export type LegendenEintrag = { label: string; farbe: string; gross?: boolean };

// Kleine Legende in einer Kartenecke: immer fester Stand / Wanderstand, dazu
// auf Wunsch weitere Punkt-Symbole der jeweiligen Karte. Lässt Klicks zur
// Karte durch, damit sie am Handy nicht im Weg ist.
export function KartenLegende({
  zusatz = [],
  className = "bottom-2 left-2",
}: {
  zusatz?: LegendenEintrag[];
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-[500] flex flex-col gap-0.5 rounded-md border border-border bg-card/90 px-2 py-1 text-xs leading-tight shadow-sm ${className}`}
    >
      <PinZeile wanderstand={false} label="Fester Stand" />
      <PinZeile wanderstand label="Wanderstand" />
      {zusatz.map((eintrag) => (
        <span key={eintrag.label} className="flex items-center gap-1.5">
          <span className="flex w-2.5 justify-center">
            <span
              aria-hidden
              className={`inline-block rounded-full border border-white ${eintrag.gross ? "h-2.5 w-2.5" : "h-2 w-2"}`}
              style={{ background: eintrag.farbe }}
            />
          </span>
          {eintrag.label}
        </span>
      ))}
    </div>
  );
}

function PinZeile({ wanderstand, label }: { wanderstand: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="flex w-2.5 justify-center"
        // Statisches, selbst erzeugtes SVG (keine Nutzereingabe).
        dangerouslySetInnerHTML={{ __html: standPinSvg(wanderstand, 10) }}
      />
      {label}
    </span>
  );
}
