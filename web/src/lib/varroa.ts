// Schadschwellen für den Varroa-Befall und die Umrechnung der gezählten
// Milben in einen vergleichbaren Befallsgrad.
//
// Quellenlage (Stand September 2026):
//
// * Hauptquelle ist die AFI-Empfehlung Nr. 4 "Varroa unter Kontrolle -
//   vitale Bienenvölker" der Arbeitsgemeinschaft der Institute für
//   Bienenforschung (Radtke/Binder-Köllhofer/Neumann, 08/2021,
//   www.imkerberater.de). Daraus stammen direkt:
//     - Juli/August: Schadschwelle 5 Milben/Tag im Gemüll bzw. 5 Milben je
//       Bienenprobe (100-ml-Becher randvoll = ca. 50 g = ca. 500 Bienen)
//       = 1 Milbe / 100 Bienen = 1 % Befall; beides entspricht rund
//       1.000 Milben im Volk.
//     - Spätherbst/Winter: ab 0,5 Milben/Tag behandeln ("1 Milbe/Tag im
//       November entspricht ca. 500 lebenden Milben im Volk").
//
// * Die Werte für Frühjahr, Juni, September und Oktober stehen so nicht in
//   der AFI-Empfehlung (deren Kontrollplan startet im Juli). Sie sind aus
//   der gängigen Praxisliteratur abgeleitet - u.a. varroaresistenzprojekt.eu
//   (Bienenprobe: Mai 2-3 %, Juni 3 %, September 1-2 %, Oktober 1 %) - und
//   bewusst vorsichtig gewählt. Wer es anders handhabt, ändert die Tabelle
//   unten; sie ist die einzige Stelle, an der die Schwellen stehen.

export const VARROA_ZAEHLWEISE_OPTIONEN = [
  { wert: "PUDERZUCKER", label: "Puderzucker" },
  { wert: "AUSWASCHUNG", label: "Auswaschung" },
  { wert: "GEMUELLDIAGNOSE", label: "Gemülldiagnose" },
  { wert: "SONSTIGE", label: "Sonstige" },
];

export const VARROA_ZAEHLWEISE_LABEL: Record<string, string> = Object.fromEntries(
  VARROA_ZAEHLWEISE_OPTIONEN.map((option) => [option.wert, option.label])
);

export type VarroaMethode = "gemuell" | "bienenprobe" | "keine";

export type VarroaZeitraum = {
  /** Monate (1 = Januar), die dieser Zeitraum abdeckt. */
  monate: number[];
  label: string;
  /** Gemülldiagnose: ab so vielen Milben pro Tag ist die Schadschwelle erreicht. */
  gemuellProTag: number;
  /** Bienenprobe: ab so viel Prozent Befall (= Milben je 100 Bienen) ist sie erreicht. */
  probeProzent: number;
  /** Was jetzt zu tun ist, wenn die Schwelle erreicht ist. */
  empfehlung: string;
};

export const VARROA_ZEITRAEUME: VarroaZeitraum[] = [
  {
    monate: [3, 4, 5],
    label: "Frühjahr (März–Mai)",
    gemuellProTag: 1,
    probeProzent: 2,
    empfehlung:
      "So früh im Jahr ist das ungewöhnlich viel. Drohnenbrut konsequent schneiden, " +
      "das Volk engmaschig weiter kontrollieren und die Sommerbehandlung fest einplanen. " +
      "Sind Milben schon auf den Bienen sichtbar oder die Bienen geschädigt, sofort handeln.",
  },
  {
    monate: [6],
    label: "Juni (Vorsommer)",
    gemuellProTag: 3,
    probeProzent: 2,
    empfehlung:
      "Drohnenbrutentnahme fortsetzen und alle zwei bis drei Wochen nachmessen. " +
      "Die Sommerbehandlung direkt nach dem Abschleudern einplanen, nicht später.",
  },
  {
    monate: [7, 8],
    label: "Juli/August (Sommer)",
    gemuellProTag: 5,
    probeProzent: 1,
    empfehlung:
      "Schadschwelle der Bieneninstitute erreicht (entspricht rund 1.000 Milben im Volk): " +
      "umgehend behandeln. Je nach Befall Ameisensäure als Langzeitbehandlung, bei sehr " +
      "hohem Befall Brutentnahme mit anschließender Milchsäurebehandlung des brutfreien Volkes. " +
      "Erfolg zwei bis drei Wochen nach der Behandlung erneut kontrollieren.",
  },
  {
    monate: [9],
    label: "September",
    gemuellProTag: 3,
    probeProzent: 1,
    empfehlung:
      "Die Winterbienen entstehen jetzt. Jede Milbe zu viel kostet Überwinterungsfähigkeit. " +
      "Sofort nachbehandeln und den Erfolg zwei bis drei Wochen später erneut prüfen.",
  },
  {
    monate: [10],
    label: "Oktober",
    gemuellProTag: 1,
    probeProzent: 1,
    empfehlung:
      "Nachbehandlung prüfen und die Restentmilbung im brutfreien Volk fest einplanen. " +
      "Für eine Sommerbehandlung ist es jetzt zu spät.",
  },
  {
    monate: [11, 12, 1, 2],
    label: "Spätherbst/Winter (November–Februar)",
    gemuellProTag: 0.5,
    probeProzent: 1,
    empfehlung:
      "1 Milbe pro Tag bedeutet rund 500 Milben im Volk, deutlich zu viel für den Start " +
      "in die neue Saison. Restentmilbung mit Oxalsäure im brutfreien Volk nachholen.",
  },
];

export function varroaZeitraumFuer(datum: Date): VarroaZeitraum {
  const monat = datum.getMonth() + 1;
  return (
    VARROA_ZEITRAEUME.find((zeitraum) => zeitraum.monate.includes(monat)) ??
    VARROA_ZEITRAEUME[VARROA_ZEITRAEUME.length - 1]
  );
}

export function varroaMethode(zaehlweise: string | null | undefined): VarroaMethode {
  if (zaehlweise === "GEMUELLDIAGNOSE") return "gemuell";
  if (zaehlweise === "PUDERZUCKER" || zaehlweise === "AUSWASCHUNG") return "bienenprobe";
  return "keine";
}

/** Standardprobe nach AFI: 100-ml-Becher randvoll = ca. 50 g = ca. 500 Bienen. */
export const BIENENPROBE_STANDARD_GRAMM = 50;
const BIENEN_JE_GRAMM = 10;

export type VarroaAuswertung = {
  /** Befallsgrad: Milben/Tag (Gemüll) bzw. Prozent (Bienenprobe). */
  wert: number;
  /** Fertig formatiert inkl. Einheit, z.B. "3,3 Milben/Tag" oder "1,4 %". */
  anzeige: string;
  /** Die Schwelle desselben Zeitraums, ebenfalls formatiert. */
  schwelleAnzeige: string;
  zeitraum: VarroaZeitraum;
  schwelleErreicht: boolean;
};

// Bewusst nicht über toLocaleString: die Anzeige soll auf Server und Client
// zeichengleich sein, sonst meckert React beim Hydrieren.
function zahl(wert: number): string {
  return wert.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}

function milbenProTag(wert: number): string {
  return `${zahl(wert)} ${wert === 1 ? "Milbe" : "Milben"}/Tag`;
}

export function varroaAuswerten({
  zaehlweise,
  anzahl,
  gemuellTage,
  bienenprobeGramm,
  datum,
}: {
  zaehlweise: string | null | undefined;
  anzahl: number | null | undefined;
  gemuellTage: number | null | undefined;
  bienenprobeGramm: number | null | undefined;
  datum: Date;
}): VarroaAuswertung | null {
  if (anzahl == null || !Number.isFinite(anzahl) || anzahl < 0) return null;

  const zeitraum = varroaZeitraumFuer(datum);
  const methode = varroaMethode(zaehlweise);

  if (methode === "gemuell") {
    if (!gemuellTage || gemuellTage <= 0) return null;
    const wert = anzahl / gemuellTage;
    return {
      wert,
      anzeige: milbenProTag(wert),
      schwelleAnzeige: milbenProTag(zeitraum.gemuellProTag),
      zeitraum,
      schwelleErreicht: wert >= zeitraum.gemuellProTag,
    };
  }

  if (methode === "bienenprobe") {
    const gramm = bienenprobeGramm ?? BIENENPROBE_STANDARD_GRAMM;
    if (gramm <= 0) return null;
    // 50 g Bienen entsprechen etwa 500 Bienen, also 10 Bienen je Gramm.
    const wert = (anzahl / (gramm * BIENEN_JE_GRAMM)) * 100;
    return {
      wert,
      anzeige: `${zahl(wert)} % (Milben je 100 Bienen)`,
      schwelleAnzeige: `${zahl(zeitraum.probeProzent)} %`,
      zeitraum,
      schwelleErreicht: wert >= zeitraum.probeProzent,
    };
  }

  return null;
}
