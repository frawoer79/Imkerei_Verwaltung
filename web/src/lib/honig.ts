// Ertragsschätzung bei der Honigernte.
//
// Der Gedanke: statt am Stand die geerntete Menge zu raten, wird erfasst, was
// tatsächlich abgenommen wurde - diese Honigräume, dazu einzelne Waben. Was
// das im Schnitt an Honig ergibt, steht als Erfahrungswert in den
// Einstellungen und lässt sich dort anpassen. Weicht eine Ernte davon ab
// (Waben nicht voll, Randwaben leer), korrigiert ein Schieberegler.

/// Ein Rähmchenmaß, wie es im Formular zur Auswahl steht.
export type WabenmassAuswahl = {
  id: string;
  name: string;
  systemName: string;
  honigProWabeKg: number;
};

/// Eine Zarge, wie sie im Formular zur Auswahl steht - dieselbe Kiste kann
/// als Brutraum wie als Honigraum dienen, das ist keine Eigenschaft der
/// Zarge mehr (siehe Prisma-Schema). `wabenmassEignung` bestimmt trotzdem,
/// wo sie sinnvoll auftaucht: ein reines Brutraum-Rähmchenmaß (z.B. "1.5")
/// wird nicht als Honigraum angeboten und umgekehrt.
export type ZargeAuswahl = {
  id: string;
  name: string;
  systemName: string;
  systemId: string;
  wabenmassEignung: string;
  wabenAnzahl: number;
  honigProZargeKg: number;
};

/// Ein Honigraum, der gerade auf einem Volk sitzt.
export type OffenerAufsatz = {
  id: string;
  bezeichnung: string;
  honigProZargeKg: number;
  wabenbeschaffenheit: string | null;
  aufgesetztAm: Date;
};

/// Eine frei erfasste Zeile im Ernteformular: so viele Stück einer Größe.
/// Für Honigräume, deren Aufsetzen nicht dokumentiert wurde, und für
/// einzelne Waben.
export type ErnteAnteil = {
  /// Nur im Formular, damit React die Zeilen auseinanderhalten kann.
  zeilenId: string;
  istZarge: boolean;
  /// id der Zarge bzw. des Wabenmaßes.
  groesseId: string;
  anzahl: number;
};

/// Eine Zeile im Formular "Honigraum aufgesetzt".
export type AufsatzZeile = {
  zeilenId: string;
  zargeId: string;
  anzahl: number;
  wabenbeschaffenheit: Wabenbeschaffenheit;
};

export const WABENBESCHAFFENHEITEN = [
  { wert: "AUSGEBAUT", label: "Ausgebaute Waben" },
  { wert: "MITTELWAENDE", label: "Nur Mittelwände" },
  { wert: "GEMISCHT", label: "Gemischt" },
] as const;
export type Wabenbeschaffenheit = (typeof WABENBESCHAFFENHEITEN)[number]["wert"];

export const WABENBESCHAFFENHEIT_LABEL: Record<string, string> = Object.fromEntries(
  WABENBESCHAFFENHEITEN.map((eintrag) => [eintrag.wert, eintrag.label])
);

/// Wie weit sich die Schätzung nach oben und unten korrigieren lässt.
export const KORREKTUR_MIN = 40;
export const KORREKTUR_MAX = 160;
export const KORREKTUR_SCHRITT = 5;

/// Summe der Durchschnittswerte über alle frei erfassten Zeilen.
export function schaetzungBerechnen(
  anteile: ErnteAnteil[],
  zargen: ZargeAuswahl[],
  wabenmasse: WabenmassAuswahl[]
): number {
  let summe = 0;
  for (const anteil of anteile) {
    const gewicht = gewichtProEinheit(anteil, zargen, wabenmasse);
    if (gewicht === null) continue;
    summe += gewicht * anteil.anzahl;
  }
  return runden(summe);
}

/// Durchschnittsertrag einer einzelnen Zarge bzw. Wabe, `null` wenn die
/// Größe (noch) nicht gewählt ist.
export function gewichtProEinheit(
  anteil: ErnteAnteil,
  zargen: ZargeAuswahl[],
  wabenmasse: WabenmassAuswahl[]
): number | null {
  if (anteil.istZarge) {
    return zargen.find((eintrag) => eintrag.id === anteil.groesseId)?.honigProZargeKg ?? null;
  }
  return wabenmasse.find((eintrag) => eintrag.id === anteil.groesseId)?.honigProWabeKg ?? null;
}

/// Klartext einer Zeile, z.B. "Zander Flachzarge (2/3), 10 Waben". Wird beim
/// Speichern als Kopie mitgeschrieben, damit ein alter Eintrag lesbar bleibt,
/// wenn die Größe später aus den Einstellungen verschwindet.
export function zargeBezeichnung(zarge: {
  systemName: string;
  name: string;
  wabenAnzahl: number;
}): string {
  return `${zarge.systemName} ${zarge.name}, ${zarge.wabenAnzahl} Waben`;
}

/// Klartext einer Brutraum-Betriebsweise, z.B. "Zander ganz (1/1)" oder
/// "2 × Zander Flachzarge (2/3)".
export function brutraumBezeichnung(zarge: {
  systemName: string;
  name: string;
  zargenAnzahl: number;
}): string {
  const basis = `${zarge.systemName} ${zarge.name}`;
  return zarge.zargenAnzahl > 1 ? `${zarge.zargenAnzahl} × ${basis}` : basis;
}

export function anteilBezeichnung(
  anteil: ErnteAnteil,
  zargen: ZargeAuswahl[],
  wabenmasse: WabenmassAuswahl[]
): string {
  if (anteil.istZarge) {
    const zarge = zargen.find((eintrag) => eintrag.id === anteil.groesseId);
    return zarge ? zargeBezeichnung(zarge) : "Zarge";
  }
  const wabenmass = wabenmasse.find((eintrag) => eintrag.id === anteil.groesseId);
  if (!wabenmass) return "Waben";
  return `${wabenmass.systemName} ${wabenmass.name}`;
}

/// Auf 100 g genau - feiner ist bei einer Schätzung nicht ehrlich.
export function runden(kg: number): number {
  return Math.round(kg * 10) / 10;
}

/// Deutsche Schreibweise mit Komma, z.B. "24,5".
export function kgAnzeige(kg: number): string {
  return runden(kg).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/// Datum (TT.MM.JJJJ) für die Liste der aufgesetzten Honigräume.
export function kurzesDatum(datum: Date): string {
  return datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/// Gleiche Einträge zu "2× ..." zusammenfassen und mit " · " verbinden.
/// Zwei baugleiche Honigräume sind in der Anzeige sonst nur Wiederholung.
export function gruppiertAufzaehlen(bezeichnungen: string[]): string {
  const zaehler = new Map<string, number>();
  for (const bezeichnung of bezeichnungen) {
    zaehler.set(bezeichnung, (zaehler.get(bezeichnung) ?? 0) + 1);
  }
  return [...zaehler.entries()]
    .map(([bezeichnung, anzahl]) => (anzahl === 1 ? bezeichnung : `${anzahl}× ${bezeichnung}`))
    .join(" · ");
}
