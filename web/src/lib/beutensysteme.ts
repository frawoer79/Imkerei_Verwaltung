// Katalog der gebräuchlichen Beutensysteme mit ihren Rähmchenmaßen.
//
// Quellen für die Maße (Breite x Höhe in mm, Außenmaß der Oberleiste ohne
// Ohren): Wikipedia "Rähmchen", thehoneyfactory.de "Rähmchen Maße Vergleich",
// LWG Bayern "Welches Rähmchen soll ich verwenden".
//
// Verbreitung in Deutschland: Deutsch Normalmaß in Mittel- und
// Norddeutschland, Zander in Süddeutschland, Langstroth international
// führend, Dadant Blatt europaweit am weitesten verbreitet, Kuntzsch
// verstreut im deutschsprachigen Raum. Miniplus ist kein Wirtschaftsvolk-
// System, sondern für Begattungsvölkchen und Ableger in der Königinnenzucht.
//
// Die kg-Angaben sind KEINE gemessenen Werte, sondern aus der Wabenfläche
// abgeleitete Richtwerte (grob 2,1 kg je 1000 cm² voller Wabe). Sie stehen
// hier nur, damit niemand bei null anfangen muss - jeder soll sie an seinen
// eigenen Ernten nachziehen.

/// Wofür ein Rähmchenmaß in der Praxis benutzt wird. Flachzargen stehen
/// bewusst auf BEIDES: Flachzargenbetrieb (zwei oder drei Flachzargen als
/// Brutraum) ist verbreitet, nicht nur der Einsatz als Honigraum.
export const EIGNUNGEN = ["BRUTRAUM", "HONIGRAUM", "BEIDES"] as const;
export type Eignung = (typeof EIGNUNGEN)[number];

export type WabenmassVorlage = {
  name: string;
  breiteMm: number;
  hoeheMm: number;
  honigProWabeKg: number;
  eignung: Eignung;
  /// Übliche Wabenzahl einer Zarge dieses Maßes - Vorschlag beim Anlegen.
  wabenAnzahl: number;
  /// Nur nötig, wenn es zu diesem Maß mehrere gebräuchliche Zargen gibt
  /// (z.B. Miniplus: Standardzarge mit 6, Überwinterungszarge mit 12 Waben).
  /// Ohne Angabe entsteht eine Zarge mit dem Namen des Maßes und wabenAnzahl.
  zargen?: ZargenVorlage[];
};

export type ZargenVorlage = {
  name: string;
  wabenAnzahl: number;
};

export type BeutensystemVorlage = {
  name: string;
  beschreibung: string;
  wabenmasse: WabenmassVorlage[];
};

export const BEUTENSYSTEM_KATALOG: BeutensystemVorlage[] = [
  {
    name: "Zander",
    beschreibung: "In Süddeutschland verbreitet. Viele Varianten vom Halbrahmen bis Zadant.",
    wabenmasse: [
      { name: "ganz (1/1)", breiteMm: 420, hoeheMm: 220, honigProWabeKg: 2, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "Flachzarge (2/3)", breiteMm: 420, hoeheMm: 159, honigProWabeKg: 1.4, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "halb (1/2)", breiteMm: 420, hoeheMm: 110, honigProWabeKg: 1, eignung: "HONIGRAUM", wabenAnzahl: 10 },
      { name: "1.5", breiteMm: 420, hoeheMm: 330, honigProWabeKg: 3, eignung: "BRUTRAUM", wabenAnzahl: 10 },
      { name: "Zadant", breiteMm: 420, hoeheMm: 285, honigProWabeKg: 2.6, eignung: "BRUTRAUM", wabenAnzahl: 11 },
    ],
  },
  {
    name: "Deutsch Normalmaß",
    beschreibung: "In Mittel- und Norddeutschland das häufigste System. Kurz DNM oder DN.",
    wabenmasse: [
      { name: "ganz (1/1)", breiteMm: 370, hoeheMm: 223, honigProWabeKg: 1.8, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "flach", breiteMm: 370, hoeheMm: 159, honigProWabeKg: 1.3, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "halb (1/2)", breiteMm: 370, hoeheMm: 110, honigProWabeKg: 0.9, eignung: "HONIGRAUM", wabenAnzahl: 10 },
      { name: "anderthalb (1.5)", breiteMm: 370, hoeheMm: 338, honigProWabeKg: 2.7, eignung: "BRUTRAUM", wabenAnzahl: 10 },
    ],
  },
  {
    name: "Dadant Blatt",
    beschreibung: "Hoher Brutraum, flacher Honigraum. Europaweit am weitesten verbreitet.",
    wabenmasse: [
      { name: "Brutraum", breiteMm: 435, hoeheMm: 300, honigProWabeKg: 2.8, eignung: "BRUTRAUM", wabenAnzahl: 12 },
      { name: "Honigraum (Halbrahmen)", breiteMm: 435, hoeheMm: 159, honigProWabeKg: 1.5, eignung: "HONIGRAUM", wabenAnzahl: 12 },
    ],
  },
  {
    name: "Dadant modifiziert (US)",
    beschreibung: "Die amerikanische Dadant-Variante, etwas breiter und flacher als Dadant Blatt.",
    wabenmasse: [
      { name: "Brutraum", breiteMm: 448, hoeheMm: 285, honigProWabeKg: 2.7, eignung: "BRUTRAUM", wabenAnzahl: 10 },
      { name: "Honigraum", breiteMm: 448, hoeheMm: 141, honigProWabeKg: 1.4, eignung: "HONIGRAUM", wabenAnzahl: 10 },
    ],
  },
  {
    name: "Langstroth",
    beschreibung: "International das führende System. Alle Zargen gleich breit.",
    wabenmasse: [
      { name: "tief (deep)", breiteMm: 448, hoeheMm: 232, honigProWabeKg: 2.2, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "medium", breiteMm: 448, hoeheMm: 185, honigProWabeKg: 1.8, eignung: "BEIDES", wabenAnzahl: 10 },
      { name: "flach (shallow)", breiteMm: 448, hoeheMm: 159, honigProWabeKg: 1.5, eignung: "HONIGRAUM", wabenAnzahl: 10 },
    ],
  },
  {
    name: "Kuntzsch",
    beschreibung: "Verstreut im deutschsprachigen Raum, oft in der Golz-Beute. Hoch oder breit.",
    wabenmasse: [
      { name: "hoch", breiteMm: 250, hoeheMm: 335, honigProWabeKg: 1.8, eignung: "BEIDES", wabenAnzahl: 11 },
      { name: "breit (quer)", breiteMm: 335, hoeheMm: 250, honigProWabeKg: 1.8, eignung: "BEIDES", wabenAnzahl: 11 },
    ],
  },
  {
    name: "Miniplus",
    beschreibung:
      "Kleine Beute für Begattungsvölkchen und Ableger. Standardzarge mit 6 Waben, Überwinterungszarge (meist Holz) mit 12.",
    wabenmasse: [
      {
        name: "Rähmchen",
        breiteMm: 205,
        hoeheMm: 159,
        honigProWabeKg: 0.7,
        eignung: "BEIDES",
        wabenAnzahl: 6,
        zargen: [
          { name: "Standardzarge", wabenAnzahl: 6 },
          { name: "Überwinterungszarge (Holz)", wabenAnzahl: 12 },
        ],
      },
    ],
  },
];

/// Maßangabe für die Anzeige, z.B. "420 × 220 mm".
export function massAnzeige(breiteMm: number | null, hoeheMm: number | null): string | null {
  if (breiteMm === null || hoeheMm === null) return null;
  return `${breiteMm} × ${hoeheMm} mm`;
}

export const EIGNUNG_LABEL: Record<Eignung, string> = {
  BRUTRAUM: "nur Brutraum",
  HONIGRAUM: "nur Honigraum",
  BEIDES: "Brut- und Honigraum",
};

/// Passt ein Wabenmaß für diese Verwendung?
export function passtZu(eignung: string, verwendung: "BRUTRAUM" | "HONIGRAUM"): boolean {
  return eignung === "BEIDES" || eignung === verwendung;
}

/// Manche Systeme wurden angelegt, bevor es diesen Katalog gab, und tragen
/// eigene Namen für dieselbe Größe (z.B. "ganz" statt "ganz (1/1)",
/// "Halbrahmen (Flachzarge)" statt "Flachzarge (2/3)"). Ohne diese Zuordnung
/// würde das Ergänzen fehlender Maße Dubletten anlegen, statt die
/// vorhandenen wiederzuerkennen.
const NAMEN_ALIASE: Record<string, Record<string, string>> = {
  Zander: {
    ganz: "ganz (1/1)",
    "Halbrahmen (Flachzarge)": "Flachzarge (2/3)",
    // Komma als Dezimaltrenner kollidierte mit dem Komma der Aufzählung
    // ("Zander 1,5, 10 Waben") - seit auf Punkt umgestellt.
    "1,5": "1.5",
  },
  "Deutsch Normalmaß": {
    "anderthalb (1,5)": "anderthalb (1.5)",
  },
};

/// Der Katalogname, der zu einem (ggf. älteren, abweichend benannten)
/// Rähmchenmaß gehört - oder der Name selbst, wenn kein Alias bekannt ist.
export function katalogNameVon(systemName: string, wabenmassName: string): string {
  return NAMEN_ALIASE[systemName]?.[wabenmassName] ?? wabenmassName;
}

/// Welche Katalog-Rähmchenmaße einem System mit diesem Namen noch fehlen -
/// unter Berücksichtigung der Namens-Aliase, damit ein älter angelegtes Maß
/// nicht als "fehlend" gilt, nur weil es anders heißt als im Katalog.
export function fehlendeKatalogMasse(
  systemName: string,
  vorhandeneNamen: string[]
): WabenmassVorlage[] {
  const vorlage = BEUTENSYSTEM_KATALOG.find((eintrag) => eintrag.name === systemName);
  if (!vorlage) return [];

  const vorhanden = new Set(vorhandeneNamen.map((name) => katalogNameVon(systemName, name)));
  return vorlage.wabenmasse.filter((mass) => !vorhanden.has(mass.name));
}

/// Welche Betriebsweisen (Zargenzahl im Brutraum) für ein Rähmchenmaß Sinn
/// ergeben. Ein Maß, das nur als Brutraum taugt (z.B. Zander 1.5, Zadant),
/// ist bereits eine hohe Zarge für sich - das wird einräumig gefahren, nie
/// gestapelt. Ein Maß, das auch als Honigraum dient (ganz, Flachzarge), ist
/// niedriger und wird typischerweise ein- oder zweiräumig gefahren.
export function betriebsweisenFuer(eignung: string): number[] {
  return eignung === "BRUTRAUM" ? [1] : [1, 2];
}
