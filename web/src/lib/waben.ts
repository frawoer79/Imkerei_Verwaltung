// Waben-Arten und Rechenhilfen zum Wabenbestand - ohne Datenbank, damit
// sie auch in den Formularen im Browser laufen. Das Laden aus der Datenbank
// steht in lib/wabenbestand.ts.

/// Die Waben-Arten beim Erfassen des Ist-Stands, in Anzeige-Reihenfolge.
export const WABEN_START_ARTEN = [
  { feld: "wabenBrut", label: "Brutwaben" },
  { feld: "wabenFutter", label: "Futterwaben" },
  { feld: "wabenLeer", label: "Leerwaben" },
  { feld: "wabenMittelwaende", label: "Mittelwände" },
] as const;

export type WabenStartFeld = (typeof WABEN_START_ARTEN)[number]["feld"];
export type WabenStart = Record<WabenStartFeld, number | null> & { wabenStandAm: Date | null };

/// Die Felder einer Durchsicht, die Waben geben (+) oder entnehmen (-).
export const WABEN_AENDERUNGS_ARTEN = [
  { feld: "brutwaben", label: "Brutwaben", einzahl: "Brutwabe" },
  { feld: "futterwaben", label: "Futterwaben", einzahl: "Futterwabe" },
  { feld: "leerwaben", label: "Leerwaben", einzahl: "Leerwabe" },
  { feld: "mittelwaende", label: "Mittelwände", einzahl: "Mittelwand" },
  { feld: "baurahmenDrohnenrahmen", label: "Baurahmen / Drohnenrahmen", einzahl: "Baurahmen" },
] as const;

export type WabenAenderungsFeld = (typeof WABEN_AENDERUNGS_ARTEN)[number]["feld"];
type WabenAenderung = Partial<Record<WabenAenderungsFeld, number | null>>;

/// Höchstens so viele Waben je Art in einer Durchsicht (gegeben wie entnommen).
export const WABEN_AENDERUNG_MAX = 20;

/// Fallback für die Obergrenze beim Erfassen, wenn kein Brutraum gewählt ist.
export const WABEN_OHNE_BRUTRAUM_MAX = 30;

export function startSumme(volk: Partial<Record<WabenStartFeld, number | null>>): number {
  return WABEN_START_ARTEN.reduce((summe, art) => summe + (volk[art.feld] ?? 0), 0);
}

export function aenderungSumme(eintrag: WabenAenderung): number {
  return WABEN_AENDERUNGS_ARTEN.reduce((summe, art) => summe + (eintrag[art.feld] ?? 0), 0);
}

/// Platz im Brutraum: Rähmchen je Zarge mal Zargenzahl.
export function wabenPlatz(zarge: { wabenAnzahl: number } | null, zargenAnzahl: number): number {
  return zarge ? zarge.wabenAnzahl * Math.max(1, zargenAnzahl) : WABEN_OHNE_BRUTRAUM_MAX;
}

/// Kurzer Text für gegebene/entnommene Waben eines Eintrags, z.B.
/// { gegeben: "2 Mittelwände", entnommen: "3 Brutwaben" }.
export function wabenAenderungText(eintrag: WabenAenderung): { gegeben: string | null; entnommen: string | null } {
  const teil = (vorzeichen: 1 | -1) =>
    WABEN_AENDERUNGS_ARTEN.flatMap((art) => {
      const wert = (eintrag[art.feld] ?? 0) * vorzeichen;
      if (wert <= 0) return [];
      return [`${wert} ${wert === 1 ? art.einzahl : art.label.replace(" / Drohnenrahmen", "")}`];
    }).join(", ") || null;
  return { gegeben: teil(1), entnommen: teil(-1) };
}
