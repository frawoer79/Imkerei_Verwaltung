// Chronologisch kommt schon sortiert aus der Datenbank (Reihenfolge der
// Anlage). Bei Standposition wird stattdessen nach standReihenfolge sortiert -
// Völker ohne eigenen Wert (neu angelegt, seit dem letzten Umschalten auf
// diese Sortierung noch nie einsortiert) behalten ihren chronologischen Platz
// am Ende, weil Array.prototype.sort stabil ist und die Eingabe bereits
// chronologisch geordnet war.
export function sortiereVoelker<T extends { standReihenfolge: number | null }>(
  voelker: T[],
  sortierung: string
): T[] {
  if (sortierung !== "STANDPOSITION") return voelker;
  return [...voelker].sort((a, b) => {
    if (a.standReihenfolge == null) return b.standReihenfolge == null ? 0 : 1;
    if (b.standReihenfolge == null) return -1;
    return a.standReihenfolge - b.standReihenfolge;
  });
}
