// Höchstlängen für alles, was man von Hand eintippt. Ohne Grenze ließen sich
// beliebig lange Namen und Nummern speichern, die dann in Kacheln und
// Stammdaten über den Rand laufen (Tester-Rückmeldung 2026-10-19).
//
// Zwei Stellen lesen diese Datei:
//  - die Eingabefelder (Input/Textarea in components/ui.tsx) setzen daraus
//    maxLength, der Browser lässt dann gar nicht mehr Zeichen zu;
//  - die Datenbank-Verbindung (lib/datenbank.ts) prüft vor jedem Speichern
//    noch einmal, falls jemand am Browser vorbei schickt.
//
// Schon gespeicherte, längere Werte bleiben, wie sie sind. Sie dürfen auch
// unverändert wieder gespeichert werden; nur ein geänderter Wert muss passen.

export const LAENGE = {
  /// Namen von Völkern, Ständen, Lagerorten, Material usw.
  name: 40,
  /// Kurze Kennzeichen: Königin-Kennung, Einheit, Honigart.
  kurz: 20,
  /// Nummer auf dem Zeichenplättchen.
  zeichenNummer: 5,
  /// Nummern wie Zuchtbuch-, Beleg-, Chargen-, Registriernummer.
  nummer: 40,
  /// Kurze Angaben wie Rasse, Linie, Ort, Wirkstoff.
  angabe: 60,
  /// Eine Zeile Text: Straße, Titel, Maßnahme, Grund.
  zeile: 120,
  /// Medikamentnamen sind oft lang ("Oxalsäuredihydrat-Lösung 3,5 % ...").
  medikament: 100,
  /// E-Mail-Adressen und Servernamen (technische Obergrenze).
  mail: 254,
  /// Name neben dem Logo im Menü. Mehr passt in der Seitenleiste auch auf
  /// zwei Zeilen nicht gut.
  menueName: 30,
  /// Notizen und Bemerkungen.
  text: 5000,
} as const;

/// Ohne eigenen Eintrag unten: einzeiliges Textfeld bzw. mehrzeiliges Feld.
export const STANDARD_ZEILE = 200;
export const STANDARD_TEXT = LAENGE.text;

/// Höchstwert für Zahlenfelder ohne eigenes max. Ganzzahl-Spalten in der
/// Datenbank fassen höchstens gut 2 Milliarden, alles darüber wäre ein Absturz.
export const STANDARD_ZAHL_MAX = 999999;
export const ZAHL_GRENZE_DATENBANK = 2_000_000_000;

/// Formularfelder nach ihrem name-Attribut. Gilt überall, wo das Feld so
/// heißt; ein Feld kann mit eigenem maxLength abweichen (z.B. Medikamentname).
export const FELD_GRENZEN: Record<string, number> = {
  name: LAENGE.name,
  bezeichnung: LAENGE.name,
  neueKategorie: LAENGE.name,
  neueSorte: LAENGE.name,
  neuerLagerort: LAENGE.name,
  neuerTyp: LAENGE.name,
  neuesGebinde: LAENGE.name,
  halterName: 80,
  menueName: LAENGE.menueName,
  kennung: LAENGE.kurz,
  einheit: LAENGE.kurz,
  neueEinheit: LAENGE.kurz,
  honigart: LAENGE.kurz,
  zeichenNummer: LAENGE.zeichenNummer,
  koeniginZeichenNummer: LAENGE.zeichenNummer,
  zuchtbuchnummer: LAENGE.nummer,
  belegnummer: LAENGE.nummer,
  chargennummer: LAENGE.nummer,
  zulassungsnummer: LAENGE.nummer,
  registriernummer: LAENGE.nummer,
  telefon: 30,
  rasse: LAENGE.angabe,
  vaterlinie: LAENGE.angabe,
  drohnenvoelker: 500,
  ort: LAENGE.angabe,
  wirkstoff: LAENGE.zeile,
  anwender: LAENGE.angabe,
  mengeJeVolk: LAENGE.kurz,
  plzOrt: 80,
  strasse: LAENGE.zeile,
  titel: LAENGE.zeile,
  text: LAENGE.zeile,
  indikation: LAENGE.zeile,
  lieferant: LAENGE.zeile,
  herkunftText: LAENGE.zeile,
  storniertGrund: LAENGE.zeile,
  biotechnischeMassnahmen: LAENGE.zeile,
  kalenderTitel: LAENGE.zeile,
  email: LAENGE.mail,
  absender: LAENGE.mail,
  benutzer: LAENGE.mail,
  host: LAENGE.mail,
  gewichtKg: 30,
};

/// maxLength für ein Eingabefeld; undefined bei Feldern ohne Textlänge
/// (Zahl, Datum, Datei, Haken ...).
export function feldGrenze(name: string | undefined, art: string | undefined): number | undefined {
  if (art === "textarea") return (name && FELD_GRENZEN[name]) || STANDARD_TEXT;
  const textArt = art === undefined || ["text", "search", "email", "tel", "url"].includes(art);
  if (!textArt) return undefined;
  return (name && FELD_GRENZEN[name]) || STANDARD_ZEILE;
}

/// Grenzen je Datenbank-Spalte, nur für von Hand eingegebene Felder.
/// Bewusst nicht dabei: Dateinamen, Schlüssel und Felder, die einen Namen von
/// früher kopieren (z.B. BehandlungVolk.volkNameDamals) - ein alter, langer
/// Name darf dort nicht das Speichern einer Behandlung verhindern.
export const SPALTEN_GRENZEN: Record<string, Record<string, number>> = {
  Bienenstand: { name: LAENGE.name, strasse: LAENGE.zeile, ort: LAENGE.angabe, notizen: LAENGE.text },
  Dokumentkategorie: { name: LAENGE.name },
  Dokument: { titel: LAENGE.zeile, notizen: LAENGE.text },
  Volk: { name: LAENGE.name, rasse: LAENGE.angabe, notizen: LAENGE.text },
  Belegstelle: {
    name: LAENGE.name,
    ort: LAENGE.angabe,
    rasse: LAENGE.angabe,
    notizen: LAENGE.text,
  },
  BelegstelleJahr: { drohnenvoelker: 500 },
  Koenigin: {
    kennung: LAENGE.kurz,
    zuchtbuchnummer: LAENGE.nummer,
    rasse: LAENGE.angabe,
    zeichenNummer: LAENGE.zeichenNummer,
    herkunftText: LAENGE.zeile,
    vaterlinie: LAENGE.angabe,
    notizen: LAENGE.text,
    zuchtkarteBemerkung: LAENGE.text,
    honigertragBemerkung: LAENGE.text,
  },
  Zuchtserie: { bezeichnung: LAENGE.name, notizen: LAENGE.text },
  KoeniginEreignis: { notiz: LAENGE.text },
  StockkartenEintrag: {
    biotechnischeMassnahmen: LAENGE.zeile,
    honigart: LAENGE.kurz,
    notizen: LAENGE.text,
  },
  Massnahme: { text: 500 },
  Bild: { beschreibung: LAENGE.zeile },
  Betrieb: {
    halterName: 80,
    menueName: LAENGE.menueName,
    strasse: LAENGE.zeile,
    plzOrt: 80,
    telefon: 30,
    email: LAENGE.mail,
    registriernummer: LAENGE.nummer,
    kalenderTitel: LAENGE.zeile,
  },
  Medikament: {
    name: LAENGE.medikament,
    wirkstoff: LAENGE.zeile,
    zulassungsnummer: LAENGE.nummer,
    einheit: LAENGE.kurz,
    lieferant: LAENGE.zeile,
    belegnummer: LAENGE.nummer,
    chargennummer: LAENGE.nummer,
    notizen: LAENGE.text,
  },
  Behandlung: {
    indikation: LAENGE.zeile,
    anwender: LAENGE.angabe,
    bemerkung: LAENGE.text,
    storniertGrund: LAENGE.zeile,
  },
  Beutensystem: { name: LAENGE.name, notizen: LAENGE.text },
  Wabenmass: { name: LAENGE.name },
  Zarge: { name: LAENGE.name },
  Lagerort: { name: LAENGE.name, notizen: LAENGE.text },
  Materialartikel: { name: LAENGE.name, einheit: LAENGE.kurz, notizen: LAENGE.text },
  Erzeugnistyp: { name: LAENGE.name, einheit: LAENGE.kurz },
  Gebinde: { name: LAENGE.name },
  Sorte: { name: LAENGE.name },
  ErzeugnisBuchung: { notizen: LAENGE.text },
  Honigraumaufsatz: { bezeichnung: LAENGE.name },
  MailEinstellung: { host: LAENGE.mail, benutzer: LAENGE.mail, absender: LAENGE.mail },
  MailEmpfaenger: { adresse: LAENGE.mail },
  VelutinaNestsuche: { name: LAENGE.name, notiz: LAENGE.text },
  VelutinaLocktopf: { name: LAENGE.name },
  VelutinaFlugbeobachtung: { notiz: LAENGE.text },
};

/// Die erste Spalte in `daten`, deren Text zu lang oder deren Zahl für die
/// Datenbank zu groß ist; null, wenn alles passt.
export function zuLangeSpalte(
  modell: string,
  daten: Record<string, unknown> | undefined,
): { spalte: string; grenze: number } | null {
  if (!daten || typeof daten !== "object") return null;
  const grenzen = SPALTEN_GRENZEN[modell] ?? {};
  for (const [spalte, wert] of Object.entries(daten)) {
    // Prisma erlaubt auch { set: wert }.
    const roh =
      wert && typeof wert === "object" && "set" in (wert as Record<string, unknown>)
        ? (wert as Record<string, unknown>).set
        : wert;
    const grenze = grenzen[spalte];
    if (grenze !== undefined && typeof roh === "string" && roh.length > grenze) return { spalte, grenze };
    if (typeof roh === "number" && Math.abs(roh) > ZAHL_GRENZE_DATENBANK) {
      return { spalte, grenze: ZAHL_GRENZE_DATENBANK };
    }
  }
  return null;
}
