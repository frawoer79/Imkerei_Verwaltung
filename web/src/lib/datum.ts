// Für <input type="datetime-local"> - lokale Zeit, keine Zeitzonen-Umrechnung
// wie bei toISOString() (die würde auf UTC springen).
export function jetztAlsInputWert(): string {
  const jetzt = new Date();
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}T${zweistellig(jetzt.getHours())}:${zweistellig(jetzt.getMinutes())}`;
}

/// Heutiges Datum (lokal) für <input type="date">, z.B. "2026-10-17". Wie oben:
/// toISOString() rechnet auf UTC um und liefert zwischen 0 und 2 Uhr (Sommerzeit)
/// noch den Vortag.
export function heuteAlsInputWert(): string {
  return jetztAlsInputWert().slice(0, 10);
}
