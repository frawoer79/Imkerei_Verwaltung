// Erlaubte Zeichen in Telefonnummern: Ziffern, +, Leerzeichen, -, / und runde
// Klammern. Damit gehen die üblichen Schreibweisen wie "07032/1234" oder
// "+49 (0) 7032 1234", Buchstaben aber nicht.
export const TELEFON_ZEICHEN = /[^0-9+()/ -]/g;

// Gleiche Regel als HTML-Attribut "pattern". Browser werten es mit dem
// v-Flag aus, dort müssen ( ) / und - in eckigen Klammern escapt sein.
export const TELEFON_MUSTER = "[0-9+\\(\\)\\/ \\-]*";

export const TELEFON_HINWEIS =
  "Bitte nur Ziffern, +, Leerzeichen, -, / und Klammern verwenden.";

export function telefonGueltig(wert: string) {
  return !new RegExp(TELEFON_ZEICHEN.source).test(wert);
}
