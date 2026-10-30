// Gewicht als Summe von Teilgewichten, z.B. "13+17" oder "12,4 + 15.8" beim
// vollständigen Wiegen in zwei Hälften. Wird im Browser (Feld rechnet beim
// Verlassen) und auf dem Server (falls ohne Verlassen gespeichert wird)
// gleich ausgewertet.
//
// Erlaubt: Zahlen, "+", Leerzeichen, Komma oder Punkt als Dezimaltrenner
// (deutsche wie Schweizer Schreibweise). Tausendertrenner gibt es nicht -
// "1.250" ist 1,25 kg, nicht 1250 kg.

export const WIEGEMETHODE_OPTIONEN = [
  { wert: "EINSEITIG", label: "einseitig" },
  { wert: "VOLLSTAENDIG", label: "vollständig" },
];

export type GewichtSumme =
  | { art: "leer" }
  | { art: "zahl"; wert: number; summanden: number }
  | { art: "fehler" };

const SUMMAND = /^\d+(?:[.,]\d+)?$|^[.,]\d+$|^\d+[.,]$/;

export function gewichtSummeAuswerten(text: string): GewichtSumme {
  const ohneLeerzeichen = text.replace(/\s+/g, "");
  if (ohneLeerzeichen === "") return { art: "leer" };
  const teile = ohneLeerzeichen.split("+");
  // Ein "+" am Ende (gerade getippt, zweites Gewicht fehlt noch) zählt nicht
  // als Fehler, sondern wird ignoriert.
  if (teile.length > 1 && teile[teile.length - 1] === "") teile.pop();
  if (teile.length === 0 || teile.some((teil) => !SUMMAND.test(teil))) return { art: "fehler" };
  const summe = teile.reduce((gesamt, teil) => gesamt + Number(teil.replace(",", ".")), 0);
  if (!Number.isFinite(summe)) return { art: "fehler" };
  // Auf Gramm runden, damit 12,4 + 15,8 nicht 28,200000000000003 ergibt.
  return { art: "zahl", wert: Math.round(summe * 1000) / 1000, summanden: teile.length };
}

/// Zahl für das Eingabefeld: deutsches Komma, keine überflüssigen Nullen.
export function gewichtFuersFeld(wert: number): string {
  return wert.toString().replace(".", ",");
}
