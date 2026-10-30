// Einzeln geführte Eimer (Schalter "Eimer einzeln wiegen" je Erzeugnis):
// gemeinsame Rechnung für die Vorschau im Dialog und das Buchen auf dem
// Server, damit beide garantiert dasselbe ergeben.

// Eimer und Hobbocks werden wie beim Symbol am Namen erkannt, Gläser nie.
export function istEimerGebinde(name: string | null | undefined): boolean {
  return Boolean(name && /eimer|hobbock/i.test(name) && !/glas/i.test(name));
}

// Ein Eimer beim Auslagern oder Abfüllen: einzeln geführt (mit Nummer) oder
// einer der älteren Eimer ohne Einzelgewicht, die mit dem Nennwert zählen.
export type EimerEinheit = { eimerId: string | null; nummer: number | null; gewicht: number };

export type EimerAnteil = EimerEinheit & { entnommen: number; rest: number };

function aufGramm(menge: number): number {
  return Math.round(menge * 1000) / 1000;
}

// Leert die Eimer der Reihe nach, bis die abgefüllte Menge erreicht ist. Der
// letzte kann angebrochen bleiben (rest > 0); Eimer, die gar nicht gebraucht
// werden, fehlen im Ergebnis. `fehlt` > 0 heißt: die Eimer reichen nicht.
export function abfuellenAufteilen(einheiten: EimerEinheit[], menge: number): { anteile: EimerAnteil[]; fehlt: number } {
  const anteile: EimerAnteil[] = [];
  let offen = aufGramm(menge);
  for (const einheit of einheiten) {
    if (offen < 0.0005) break;
    const entnommen = aufGramm(Math.min(einheit.gewicht, offen));
    offen = aufGramm(offen - entnommen);
    anteile.push({ ...einheit, entnommen, rest: aufGramm(einheit.gewicht - entnommen) });
  }
  return { anteile, fehlt: Math.max(offen, 0) };
}

// Vorschlag fürs Abfüllen: so viele Gläser der größten Glasgröße, wie in die
// gewählten Eimer passen. Der Rest lässt sich danach von Hand verteilen.
export function glaeserVorschlag(gesamt: number, glaeser: { id: string; inhalt: number }[]): Record<string, number> {
  const groesstes = [...glaeser].sort((a, b) => b.inhalt - a.inhalt)[0];
  if (!groesstes || groesstes.inhalt <= 0) return {};
  return { [groesstes.id]: Math.floor(aufGramm(gesamt) / groesstes.inhalt + 0.0005) };
}
