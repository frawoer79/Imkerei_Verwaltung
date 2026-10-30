import {
  GESAMTEINDRUCK_KRITERIUM as GESAMTEINDRUCK,
  kriteriumEinstufung,
  stufeKurz,
  stufeText,
} from "@/components/stockkarten-eintrag-felder";
import { AmpelSymbol } from "@/components/ampel-symbol";
import { AMPEL_VOLL, EINSTUFUNG_AMPEL } from "@/lib/ampel";

// Gesamteindruck als gefüllte Plakette in Ampelfarbe (z.B. auf der
// Volkskachel am Stand), gelb und rot zusätzlich mit Symbol. Nur der
// Wertungstext, keine Note.
export function GesamteindruckPlakette({ wert }: { wert: number }) {
  const einstufung = kriteriumEinstufung(GESAMTEINDRUCK, wert) ?? "gruen";
  return (
    <span
      title={`Gesamteindruck: ${stufeText(GESAMTEINDRUCK, wert)}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${AMPEL_VOLL[EINSTUFUNG_AMPEL[einstufung]]}`}
    >
      <AmpelSymbol einstufung={einstufung} className="h-3.5 w-3.5 shrink-0" />
      {stufeKurz(GESAMTEINDRUCK, wert)}
    </span>
  );
}
