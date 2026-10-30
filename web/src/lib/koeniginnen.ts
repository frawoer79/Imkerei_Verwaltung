// Fachlogik rund um Königinnen: Beschriftungen, Jahresfarben, Kennungen und
// die Ableitung des Verbleibs aus dem letzten Ereignis.

export const HERKUENFTE = [
  "EIGENE_NACHZUCHT",
  "NACHSCHAFFUNG",
  "ZUGEFLOGEN",
  "ZUKAUF",
  "UNBEKANNT",
] as const;
export type Herkunft = (typeof HERKUENFTE)[number];

export const HERKUNFT_LABEL: Record<Herkunft, string> = {
  EIGENE_NACHZUCHT: "Eigene Nachzucht",
  NACHSCHAFFUNG: "Nachschaffung im Volk",
  ZUGEFLOGEN: "Zugeflogen (Schwarm)",
  ZUKAUF: "Zukauf",
  UNBEKANNT: "Unbekannt",
};

export const BEGATTUNGSARTEN = [
  "BELEGSTELLE",
  "STANDBEGATTUNG",
  "KUENSTLICHE_BESAMUNG",
  "UNBEKANNT",
] as const;
export type Begattungsart = (typeof BEGATTUNGSARTEN)[number];

export const BEGATTUNGSART_LABEL: Record<Begattungsart, string> = {
  BELEGSTELLE: "Belegstellenbegattet",
  STANDBEGATTUNG: "Standbegattet",
  KUENSTLICHE_BESAMUNG: "Künstlich besamt",
  UNBEKANNT: "Begattung unbekannt",
};

/// Kurzform für Kacheln und Listen, wo der lange Name nicht hinpasst.
export const BEGATTUNGSART_KURZ: Record<Begattungsart, string> = {
  BELEGSTELLE: "Belegstelle",
  STANDBEGATTUNG: "Standbegattet",
  KUENSTLICHE_BESAMUNG: "Besamt",
  UNBEKANNT: "Unbekannt",
};

export const KOENIGIN_STATUS = [
  "IM_VOLK",
  "RESERVE",
  "VERKAUFT",
  "VERSTORBEN",
  "GESCHWAERMT",
] as const;
export type KoeniginStatus = (typeof KOENIGIN_STATUS)[number];

export const STATUS_LABEL: Record<KoeniginStatus, string> = {
  IM_VOLK: "im Volk",
  RESERVE: "Reserve / Ableger",
  VERKAUFT: "verkauft",
  VERSTORBEN: "verstorben",
  GESCHWAERMT: "geschwärmt",
};

/// Lebt sie noch und steht sie zur Verfügung? Bestimmt, ob sie in Auswahlen
/// für "Königin zusetzen" auftaucht.
export function istVerfuegbar(status: KoeniginStatus): boolean {
  return status === "IM_VOLK" || status === "RESERVE";
}

export const EREIGNIS_ARTEN = [
  "GESCHLUEPFT",
  "ZUR_BELEGSTELLE",
  "VON_BELEGSTELLE",
  "ZUGESETZT",
  "IN_ABLEGER",
  "ENTNOMMEN",
  "VERKAUFT",
  "VERSTORBEN",
  "GESCHWAERMT",
  "SONSTIGES",
] as const;
export type EreignisArt = (typeof EREIGNIS_ARTEN)[number];

export const EREIGNIS_LABEL: Record<EreignisArt, string> = {
  GESCHLUEPFT: "Geschlüpft",
  ZUR_BELEGSTELLE: "Zur Belegstelle gebracht",
  VON_BELEGSTELLE: "Von der Belegstelle zurück",
  ZUGESETZT: "In ein Volk zugesetzt",
  IN_ABLEGER: "In Ableger gesetzt",
  ENTNOMMEN: "Aus dem Volk genommen",
  VERKAUFT: "Verkauft / abgegeben",
  VERSTORBEN: "Verstorben",
  GESCHWAERMT: "Mit Schwarm abgegangen",
  SONSTIGES: "Sonstiges",
};

/// Beim Umweiseln: was mit der Königin passiert, die bisher im Volk saß. Jede
/// Wahl wird ein Ereignis in ihrem Lebenslauf; "verschwunden" ist fachlich
/// ein Abgang ohne Leiche (stille Umweiselung, Verlust) und zählt deshalb
/// wie verstorben, erkennbar an der Notiz.
export const UMWEISEL_VERBLEIBE = ["ABGEDRUECKT", "RESERVE", "VERKAUFT", "VERSCHWUNDEN"] as const;
export type UmweiselVerbleib = (typeof UMWEISEL_VERBLEIBE)[number];

export const UMWEISEL_VERBLEIB: Record<UmweiselVerbleib, { label: string; art: EreignisArt; notiz: string }> = {
  ABGEDRUECKT: { label: "Abgedrückt", art: "VERSTORBEN", notiz: "Abgedrückt" },
  RESERVE: { label: "In Reserve / Ableger", art: "ENTNOMMEN", notiz: "Entnommen" },
  VERKAUFT: { label: "Verkauft", art: "VERKAUFT", notiz: "Verkauft" },
  VERSCHWUNDEN: { label: "Verschwunden", art: "VERSTORBEN", notiz: "Verschwunden" },
};

/// Kurztext für die Karte "Umgeweiselt" im Verlauf des Volks: was aus der
/// alten Königin wurde, abgeleitet aus ihrem Ereignis am selben Tag.
export function verbleibKurz(art: EreignisArt, notiz: string | null): string {
  if (art === "VERSTORBEN") return notiz?.startsWith("Verschwunden") ? "verschwunden" : "abgedrückt";
  if (art === "VERKAUFT") return "verkauft";
  if (art === "IN_ABLEGER") return "in Ableger";
  return "in Reserve";
}

/// Ereignisse, bei denen ein Volk mit angegeben werden muss bzw. kann.
export const EREIGNIS_MIT_VOLK: EreignisArt[] = ["ZUGESETZT", "IN_ABLEGER", "ENTNOMMEN"];

/// Welchen Verbleib ein Ereignis nach sich zieht. `null` heißt: der bisherige
/// Stand bleibt (z.B. beim Schlupf oder einer bloßen Bemerkung).
export function statusNachEreignis(art: EreignisArt): KoeniginStatus | null {
  switch (art) {
    case "ZUGESETZT":
      return "IM_VOLK";
    case "IN_ABLEGER":
    case "ENTNOMMEN":
    case "VON_BELEGSTELLE":
      return "RESERVE";
    case "ZUR_BELEGSTELLE":
      return "RESERVE";
    case "VERKAUFT":
      return "VERKAUFT";
    case "VERSTORBEN":
      return "VERSTORBEN";
    case "GESCHWAERMT":
      return "GESCHWAERMT";
    default:
      return null;
  }
}

/// Ereignisse, nach denen die Königin in keinem Volk mehr sitzt - die
/// Zuordnung zum Volk wird dann gelöst.
export function loestVolkZuordnung(art: EreignisArt): boolean {
  const status = statusNachEreignis(art);
  return status !== null && status !== "IM_VOLK";
}

// --- Jahresfarben ----------------------------------------------------------
//
// International genormte Kennzeichnung: die Endziffer des Jahrgangs gibt die
// Farbe vor. Merksatz: "Weiß, gelb und rot grünen die Rosen vor blauem
// Himmel."

export type Jahresfarbe = { name: string; hex: string; dunklerText: boolean };

const FARBEN: Jahresfarbe[] = [
  { name: "blau", hex: "#3061c9", dunklerText: false }, // 0
  { name: "weiß", hex: "#ffffff", dunklerText: true }, // 1
  { name: "gelb", hex: "#f2d022", dunklerText: true }, // 2
  { name: "rot", hex: "#d1372f", dunklerText: false }, // 3
  { name: "grün", hex: "#3f8f4f", dunklerText: false }, // 4
  { name: "blau", hex: "#3061c9", dunklerText: false }, // 5
  { name: "weiß", hex: "#ffffff", dunklerText: true }, // 6
  { name: "gelb", hex: "#f2d022", dunklerText: true }, // 7
  { name: "rot", hex: "#d1372f", dunklerText: false }, // 8
  { name: "grün", hex: "#3f8f4f", dunklerText: false }, // 9
];

export function jahresfarbe(jahrgang: number | null | undefined): Jahresfarbe | null {
  if (jahrgang === null || jahrgang === undefined || !Number.isFinite(jahrgang)) return null;
  return FARBEN[((Math.trunc(jahrgang) % 10) + 10) % 10];
}

/// Die fünf möglichen Zeichenfarben zur Auswahl - unabhängig von der
/// jahrgangsbezogenen Rotation oben, nur die Namen für ein Auswahlfeld.
export const ZEICHENFARBEN = ["weiß", "gelb", "rot", "grün", "blau"] as const;

/// Aktuelles Jahr und die fünf vorangegangenen, neuestes zuerst - deckt in
/// der Praxis jede noch aktive Königin ab, ohne eine lange Liste
/// durchscrollen zu müssen. Ältere Jahrgänge lassen sich weiterhin frei
/// eintippen, wo das Formular das zulässt.
export function aktuelleJahrgaenge(jetzt: Date = new Date()): number[] {
  const aktuellesJahr = jetzt.getFullYear();
  return Array.from({ length: 6 }, (_, index) => aktuellesJahr - index);
}

/// Farbe zum Anzeigen: die von Hand eingetragene Farbe hat Vorrang, sonst die
/// Jahresfarbe. So bleibt eine abweichende Kennzeichnung sichtbar.
export function anzeigeFarbe(
  jahrgang: number | null | undefined,
  zeichenFarbe: string | null | undefined
): Jahresfarbe | null {
  const eingetragen = (zeichenFarbe ?? "").toLowerCase();
  const treffer = FARBEN.find((farbe) => eingetragen.includes(farbe.name));
  return treffer ?? jahresfarbe(jahrgang);
}

// --- Kennung ---------------------------------------------------------------

/// Kürzel aus dem Namen des Halters: "Frank Wörner" -> "FW". Ohne
/// hinterlegten Namen bleibt es beim schlichten "K".
export function kennungsKuerzel(halterName: string | null | undefined): string {
  const teile = (halterName ?? "")
    .split(/\s+/)
    .map((teil) => teil.trim())
    .filter(Boolean);
  if (teile.length === 0) return "K";
  return teile
    .slice(0, 2)
    .map((teil) => teil[0]!.toUpperCase())
    .join("");
}

/// Nächste freie Kennung für ein Jahr: "FW 2026-14". Bekommt die schon
/// vergebenen Kennungen und zählt hoch - die höchste vorhandene Nummer plus
/// eins, damit gelöschte Nummern nicht neu vergeben werden.
export function naechsteKennung(kuerzel: string, jahr: number, vorhandene: string[]): string {
  const praefix = `${kuerzel} ${jahr}-`;
  const hoechste = vorhandene
    .filter((kennung) => kennung.startsWith(praefix))
    .map((kennung) => Number.parseInt(kennung.slice(praefix.length), 10))
    .filter((nummer) => Number.isFinite(nummer))
    .reduce((max, nummer) => Math.max(max, nummer), 0);
  return `${praefix}${String(hoechste + 1).padStart(2, "0")}`;
}

// --- Anzeige ---------------------------------------------------------------

export function kurzesDatum(datum: Date | null | undefined): string {
  if (!datum) return "";
  return datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/// Jahr der Anpaarung: aus dem Begattungszeitraum, sonst der Jahrgang. Darüber
/// findet eine Belegstellen-Königin die Drohnenvölker ihrer Belegstelle.
export function belegjahr(koenigin: { begattungVon: Date | null; jahrgang: number | null }): number | null {
  return koenigin.begattungVon?.getFullYear() ?? koenigin.jahrgang ?? null;
}

/// Einzeiler für Listen: "Carnica · Jg. 2026 · Belegstelle Vogelsberg".
export function koeniginZeile(koenigin: {
  rasse: string | null;
  jahrgang: number | null;
  begattungsart: string;
  belegstelle?: { name: string } | null;
  begattungsStand?: { name: string } | null;
}): string {
  const begattung =
    koenigin.begattungsart === "BELEGSTELLE" && koenigin.belegstelle
      ? `Belegstelle ${koenigin.belegstelle.name}`
      : koenigin.begattungsart === "STANDBEGATTUNG" && koenigin.begattungsStand
        ? `standbegattet ${koenigin.begattungsStand.name}`
        : BEGATTUNGSART_KURZ[koenigin.begattungsart as Begattungsart];

  return [koenigin.rasse, koenigin.jahrgang && `Jg. ${koenigin.jahrgang}`, begattung]
    .filter(Boolean)
    .join(" · ");
}

// --- Suche und Sortierung der Übersicht -----------------------------------

export const KOENIGIN_SORTIERUNGEN = [
  { wert: "jahrgang", label: "Jahrgang, neueste zuerst" },
  { wert: "jahrgang-alt", label: "Jahrgang, älteste zuerst" },
  { wert: "kennung", label: "Kennung" },
  { wert: "stand", label: "Stand und Volk" },
  { wert: "note", label: "Bewertung, beste zuerst" },
  { wert: "toechter", label: "Meiste Töchter" },
] as const;
export type KoeniginSortierung = (typeof KOENIGIN_SORTIERUNGEN)[number]["wert"];

export type KoeniginSuche = {
  q: string;
  sort: KoeniginSortierung;
  jahrgang: string;
  begattung: string;
  /// Belegstelle bzw. Begattungsstand (Id) - nur zusammen mit `begattung`.
  ort: string;
  /// Bienenstand, an dem die Königin heute sitzt (Id), "ohne" für Königinnen
  /// ohne Volk, leer für alle Stände.
  stand: string;
};

export const ANSICHT_COOKIE = "koeniginnen-ansicht";
