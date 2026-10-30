import {
  kriteriumEinstufung,
  stufeKurz,
  stufeText,
  type BeurteilungsKriterium,
} from "@/components/stockkarten-eintrag-felder";
import { AmpelSymbol } from "@/components/ampel-symbol";
import { AMPEL_TEXT, EINSTUFUNG_AMPEL } from "@/lib/ampel";

// Zonen und Marke je Stufe (Variablen in globals.css, wechseln mit hell/dunkel).
const ZONE = { gruen: "var(--zone-ok)", gelb: "var(--zone-warnung)", rot: "var(--zone-gefahr)" } as const;
const MARKE = {
  gruen: { background: "var(--marke-ok)", borderColor: "var(--marke-ring-ok)" },
  gelb: { background: "var(--marke-warnung)", borderColor: "var(--marke-ring-warnung)" },
  rot: { background: "var(--marke-gefahr)", borderColor: "var(--marke-ring-gefahr)" },
} as const;

/// Note 1..6 als Position auf dem Strahl in Prozent - wie am Bewertungsregler.
function prozent(note: number): number {
  return ((note - 1) / 5) * 100;
}

// Eine gespeicherte Bewertung zum Nachlesen (Verlauf der Volk-Seite): Name
// oben links, darunter der Wertungstext genau über der Marke, dann ein kleiner
// Strahl mit blassen grün/gelb/rot-Zonen nach den Grenzen des Kriteriums.
// Der Text steht mittig über der Marke und wird nur an den Kanten so weit
// verschoben, dass er nicht übersteht. Rein darstellend, keine Eingabe. Eine
// Note erscheint nie als Zahl - die Lage auf dem Strahl zeigt, wie knapp der
// Wert in seiner Stufe liegt.
export function MiniStrahl({
  kriterium,
  wert,
}: {
  kriterium: Pick<BeurteilungsKriterium, "label" | "stufen" | "gelbAb" | "rotAb">;
  wert: number;
}) {
  const einstufung = kriteriumEinstufung(kriterium, wert) ?? "gruen";
  const auffaellig = einstufung !== "gruen";
  const g = prozent(kriterium.gelbAb);
  const r = prozent(kriterium.rotAb);
  const p = prozent(wert);
  const langtext = stufeText(kriterium, wert);
  const kurz = stufeKurz(kriterium, wert);
  // Geschätzte Textbreite in ch (Symbol + Abstand bei gelb/rot eingerechnet),
  // damit sich die Lage per CSS begrenzen lässt, ohne zu messen.
  const breite = `${kurz.length + (auffaellig ? 4 : 2)}ch`;
  // Mitte der Marke: 9 px Rand + Anteil der Strahlbreite (wie unten).
  const mitte = `(9px + (100% - 18px) * ${p / 100})`;

  return (
    <div role="img" aria-label={`${kriterium.label}: ${langtext}`} title={langtext}>
      <div className="text-sm text-muted">{kriterium.label}</div>
      <div className="relative mt-0.5 h-5 text-sm">
        <span
          className={`absolute top-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
            auffaellig ? `font-semibold ${AMPEL_TEXT[EINSTUFUNG_AMPEL[einstufung]]}` : "font-medium"
          }`}
          style={{
            width: breite,
            left: `clamp(0px, calc(${mitte} - ${breite} / 2), calc(100% - ${breite}))`,
          }}
        >
          <AmpelSymbol einstufung={einstufung} />
          {kurz}
        </span>
      </div>
      {/* Der Strahl läuft eine halbe Markenbreite innerhalb der Kanten, damit
          die Marke bei Note 1 und 6 nicht übersteht. */}
      <div
        className="relative mx-[9px] mt-2 mb-1 h-2 rounded-full"
        style={{
          background: `linear-gradient(to right, ${ZONE.gruen} 0 ${g}%, ${ZONE.gelb} ${g}% ${r}%, ${ZONE.rot} ${r}% 100%)`,
        }}
      >
        <span
          className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] shadow-[0_0_0_2px_var(--card)]"
          style={{ left: `${p}%`, ...MARKE[einstufung] }}
        />
      </div>
    </div>
  );
}
