// Maße der Zuchtkarte in PDF-Punkten (1 mm = 2,8346 pt). Das PDF
// (lib/zuchtkarte-pdf.tsx) und die Bildschirm-Ansicht
// (components/zuchtkarte-karte.tsx) lesen beide diese Zahlen, damit die Karte
// am Bildschirm so hoch wird wie auf dem Papier - nur so lässt sich vorher
// sagen, ob alles darauf passt.
//
// Zeilenhöhen stehen absolut da, nicht als Vielfaches der Schrift: das PDF
// übernimmt sonst die Zeilenhöhe der Umgebung auch für kleinere Schriften,
// der Browser rechnet sie dagegen je Schrift neu - die Karte wäre am
// Bildschirm niedriger als gedruckt.

export const LAYOUT = {
  /// Haarlinie als Schnittkante. Sie liegt innerhalb der Kartenmaße, die Karte
  /// bleibt also exakt 52,5 x 148 mm - sonst stimmen die Schnittmarken nicht.
  rahmen: 0.25,
  /// Abstand des Textes vom linken und rechten Kartenrand.
  seite: 10,
  /// Grundschrift und ihre Zeilenhöhe.
  schrift: 6.6,
  zeile: 8.2,

  kopf: {
    oben: 5.5,
    unten: 4.5,
    betriebSchrift: 5.6,
    betriebZeile: 7.2,
    betriebSperrung: 0.4,
    titelSchrift: 10.5,
    titelZeile: 12.6,
    titelOben: 1,
  },

  ident: {
    oben: 5,
    unten: 5,
    abstand: 7,
    linie: 1,
    punkt: 26,
    punktRand: 1,
    punktSchrift: 6.5,
    kennungSchrift: 11,
    kennungZeile: 12.8,
    untertitelOben: 2,
  },

  block: { oben: 4, unten: 4, linie: 0.5 },
  ueberschrift: { schrift: 5.4, zeile: 7, sperrung: 0.6, unten: 2.5 },
  tabelle: { luecke: 5, unten: 1.5, schluesselBreite: 40 },
  ahn: { linie: 1, links: 5, unten: 2.5, rolleSchrift: 5.2, rolleZeile: 6.6, rolleSperrung: 0.5 },
  beurteilungAbstand: 2,

  /// Bemerkungen: darunter Linien zum Weiterschreiben von Hand, so viele wie
  /// in den Rest der Karte passen (der Überschuss wird abgeschnitten).
  bemerkung: { abstand: 3, linienHoehe: 13, linienMax: 24 },

  fuss: { oben: 3.5, unten: 4, linie: 1, schrift: 5.4, zeile: 6.9 },
} as const;
