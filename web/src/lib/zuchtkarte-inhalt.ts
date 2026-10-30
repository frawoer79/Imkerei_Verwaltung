// Was auf einer Zuchtkarte steht - als reine Textfelder, ohne Prisma- oder
// Server-Importe, damit sowohl das PDF (lib/zuchtkarte-pdf.tsx) als auch die
// Bildschirm-Ansicht (components/zuchtkarte-karte.tsx) dieselbe Beschreibung
// benutzen: welche Felder es gibt, wie lang sie sein dürfen und in welchen
// Zeilen sie auf der Karte stehen.
//
// Gespeichert wird eine Karte als JSON (Tabelle `Zuchtkarte`, Spalte
// `inhalt`). Fehlende Schlüssel gelten als leer, die Karte lässt sich also um
// Felder erweitern, ohne vorhandene Karten anzufassen.

const MM = 2.834645669; // 1 mm in PDF-Punkten

/// 52,5 x 148 mm hochkant: genau ein Viertel der A4-Breite und die halbe
/// A4-Höhe. Quer auf A4 (297 mm) passen damit fünf Karten nebeneinander, mit
/// gut 17 mm Rand rechts und links.
export const KARTE_BREITE_PT = 52.5 * MM; // 148,82 pt
export const KARTE_HOEHE_PT = 148 * MM; // 419,53 pt
export const MAX_KARTEN_PRO_BLATT = 5;

export const KARTEN_FARBEN = {
  gruen: "#1f5c44",
  tinte: "#17191b",
  grau: "#6a706c",
  hellgrau: "#8a908c",
  linie: "#dcdfd9",
  rahmen: "#c9cdc6",
} as const;

export type FeldDefinition = {
  /// Name des Felds für Screenreader und Tooltips beim Bearbeiten.
  label: string;
  /// Höchstzahl Zeichen - so viel passt auch bei sonst vollen Feldern noch
  /// auf die Karte.
  max: number;
  mehrzeilig?: boolean;
  /// Grauer Hinweis im leeren Feld beim Bearbeiten (gedruckt wird nichts).
  platzhalter?: string;
};

export const KARTEN_FELDER = {
  // Kopf und Titel
  kopfzeile: { label: "Kopfzeile (Imkerei)", max: 40, platzhalter: "Name der Imkerei" },
  jahrgang: { label: "Jahrgang im Farbpunkt", max: 4, platzhalter: "--" },
  kennung: { label: "Kennung", max: 28, platzhalter: "Kennung" },
  untertitel: { label: "Rasse und Jahrgang", max: 44, platzhalter: "Rasse - Jahrgang" },
  // Herkunft
  herkunftArt: { label: "Herkunft: Art", max: 30 },
  herkunftVolk: { label: "Herkunft: aus Volk", max: 30 },
  geschluepft: { label: "Geschlüpft am", max: 14 },
  herkunftBemerkung: { label: "Herkunft: Bemerkung", max: 60 },
  // Abstammung: eine Generation, also Mutter und Vaterseite
  mutterName: { label: "Mutter: Kennung", max: 28, platzhalter: "Kennung der Mutter" },
  mutterDetail: { label: "Mutter: Angaben", max: 70, platzhalter: "Rasse, Jahrgang, Begattung" },
  vaterseite: { label: "Vaterseite", max: 64, platzhalter: "Vaterlinie / Drohnenvölker" },
  // Begattung
  begattungArt: { label: "Begattung: Art", max: 30 },
  begattungOrt: { label: "Begattung: Ort", max: 36 },
  begattungZeitraum: { label: "Begattung: Zeitraum", max: 26 },
  zeichen: { label: "Zeichen", max: 32 },
  zuchtbuch: { label: "Zuchtbuchnummer", max: 24 },
  // Beurteilung
  beurteilung: { label: "Beurteilung", max: 150, platzhalter: "z.B. Sanftmut 4,5 - Wabensitz 4,0" },
  beurteilungKontext: {
    label: "Beurteilung: Grundlage",
    max: 60,
    platzhalter: "z.B. Honig 12,5 kg, aus 3 Bewertungen",
  },
  // Bemerkungen
  bemerkung: { label: "Bemerkungen", max: 180, mehrzeilig: true, platzhalter: "Bemerkung zur Königin" },
  // Fuß
  fussName: { label: "Name im Fuß der Karte", max: 40, platzhalter: "Name" },
  fussRegNr: { label: "Registriernummer", max: 24, platzhalter: "Nr." },
} as const satisfies Record<string, FeldDefinition>;

export type KartenFeld = keyof typeof KARTEN_FELDER;
export type ZuchtkarteInhalt = Record<KartenFeld, string>;

export const KARTEN_FELD_SCHLUESSEL = Object.keys(KARTEN_FELDER) as KartenFeld[];

export function feldDefinition(feld: KartenFeld): FeldDefinition {
  return KARTEN_FELDER[feld];
}

/// Zeilen mit Beschriftung links und Wert rechts. Leere Zeilen werden nicht
/// gedruckt, beim Bearbeiten stehen sie zum Ausfüllen da.
export const HERKUNFT_ZEILEN: { feld: KartenFeld; label: string }[] = [
  { feld: "herkunftArt", label: "Art" },
  { feld: "herkunftVolk", label: "Aus Volk" },
  { feld: "geschluepft", label: "Geschlüpft" },
  { feld: "herkunftBemerkung", label: "Bemerkung" },
];

export const BEGATTUNG_ZEILEN: { feld: KartenFeld; label: string }[] = [
  { feld: "begattungArt", label: "Art" },
  { feld: "begattungOrt", label: "Ort" },
  { feld: "begattungZeitraum", label: "Zeitraum" },
  { feld: "zeichen", label: "Zeichen" },
  { feld: "zuchtbuch", label: "Zuchtbuch" },
];

/// Die Eltern im Block "Abstammung": Rolle, Name (fett) und darunter - falls
/// vorgesehen - eine Zeile mit Einzelheiten. Es bleibt bei einer Generation.
export const AHNEN: { rolle: string; name: KartenFeld; detail: KartenFeld | null }[] = [
  { rolle: "MUTTER", name: "mutterName", detail: "mutterDetail" },
  { rolle: "VATERSEITE", name: "vaterseite", detail: null },
];

export function leererInhalt(): ZuchtkarteInhalt {
  return Object.fromEntries(KARTEN_FELD_SCHLUESSEL.map((feld) => [feld, ""])) as ZuchtkarteInhalt;
}

// --- Zeichensatz -----------------------------------------------------------
//
// Die eingebauten PDF-Schriften können nur WinAnsi (Windows-1252): Umlaute
// und gängige Satzzeichen gehen, Emoji, Häkchen oder Pfeile nicht. Damit die
// Karte nie anders gedruckt wird, als sie am Bildschirm aussieht, filtert
// schon die Eingabe alles heraus, was das PDF nicht darstellen kann.

const WINANSI_ZUSATZ = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

function imKartenZeichensatz(zeichen: string): boolean {
  const code = zeichen.codePointAt(0) ?? 0;
  return (
    (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_ZUSATZ.has(zeichen)
  );
}

/// Für die laufende Eingabe: Zeichensatz, Zeilenumbrüche und Länge, aber
/// ohne Leerzeichen am Rand abzuschneiden (die gehören beim Tippen dazu).
export function kartenText(roh: string, feld: KartenFeld): string {
  const { max, mehrzeilig } = feldDefinition(feld);

  let text = roh.replace(/\r\n?/g, "\n");
  text = mehrzeilig ? text.replace(/\t/g, " ") : text.replace(/[\n\t]+/g, " ");

  let ergebnis = "";
  for (const zeichen of text) {
    if (zeichen === "\n" || imKartenZeichensatz(zeichen)) {
      ergebnis += zeichen;
      continue;
    }
    // Buchstaben mit fremdem Akzent auf den Grundbuchstaben zurückführen
    // (ő -> o), alles andere weglassen.
    const grundbuchstabe = zeichen.normalize("NFD")[0];
    if (grundbuchstabe && grundbuchstabe !== zeichen && imKartenZeichensatz(grundbuchstabe)) {
      ergebnis += grundbuchstabe;
    }
  }
  return ergebnis.slice(0, max);
}

/// Aus beliebigen (gespeicherten oder per Formular gesendeten) Werten einen
/// vollständigen, bereinigten Inhalt machen: nur bekannte Felder, nur Text,
/// zulässige Zeichen und Längen, ohne Leerraum an den Rändern.
export function inhaltBereinigen(roh: unknown): ZuchtkarteInhalt {
  const quelle = roh && typeof roh === "object" ? (roh as Record<string, unknown>) : {};
  const inhalt = leererInhalt();
  for (const feld of KARTEN_FELD_SCHLUESSEL) {
    const wert = quelle[feld];
    if (typeof wert === "string") inhalt[feld] = kartenText(wert, feld).trim();
  }
  return inhalt;
}

/// Nur den Inhalt aus einem Formular holen (Feldname = Schlüssel).
export function inhaltAusFormular(formData: FormData): ZuchtkarteInhalt {
  const roh: Record<string, unknown> = {};
  for (const feld of KARTEN_FELD_SCHLUESSEL) {
    const wert = formData.get(feld);
    if (typeof wert === "string") roh[feld] = wert;
  }
  return inhaltBereinigen(roh);
}

/// Die Jahresfarbe richtet sich nach Jahrgang und Zeichen-Text der Karte.
export function jahrgangAlsZahl(inhalt: ZuchtkarteInhalt): number | null {
  const zahl = Number.parseInt(inhalt.jahrgang, 10);
  return Number.isFinite(zahl) ? zahl : null;
}
