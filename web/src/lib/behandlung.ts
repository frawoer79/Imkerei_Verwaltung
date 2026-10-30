// Gemeinsames Wissen rund um die Behandlungsdokumentation.
//
// Rechtlicher Rahmen: Bienen sind Lebensmittel liefernde Tiere, deshalb ist
// nach Art. 108 VO (EU) 2019/6 jede Anwendung eines Tierarzneimittels
// nachzuweisen - auch bei freiverkäuflichen Mitteln wie Ameisensäure. § 2
// THAMNV zählt die Pflichtangaben auf:
//   1. Anzahl, Art und Identität der behandelten Tiere (+ Standort)
//   2. Bezeichnung des Arzneimittels
//   3. Belegnummer der tierärztlichen Abgabe (falls über Tierarzt bezogen)
//   4. verabreichte Menge
//   5. Datum der Anwendung
//   6. Wartezeit in Tagen
//   7. Name der anwendenden Person
// Dazu kommen nach § 1 Abs. 2 THAMNV die Erwerbsbelege. Alles zusammen ist
// 5 Jahre aufzubewahren und muss unveränderlich sein - deshalb werden
// Behandlungen storniert statt bearbeitet.

/// Vorschläge für das Indikationsfeld. Bewusst nur Vorschläge (Freitext
/// bleibt möglich), damit auch seltene Fälle ohne Codeänderung passen.
export const INDIKATIONEN = [
  "Varroose",
  "Nosemose",
  "Kalkbrut",
  "Amerikanische Faulbrut",
  "Europäische Faulbrut",
  "Kleiner Beutenkäfer",
  "Tracheenmilbe",
  "Sonstige",
];

/// Einheiten, in denen Bienen-Tierarzneimittel dosiert werden.
export const DOSIS_EINHEITEN = ["ml", "g", "Streifen", "Beutel", "Stück"];

/// Deutsches Zahlenformat ohne toLocaleString, damit Server und Client
/// zeichengleich rendern (sonst meckert React beim Hydrieren).
export function mengeAnzeige(wert: number, einheit?: string): string {
  const zahl = Number.isInteger(wert)
    ? wert.toString()
    : wert.toFixed(2).replace(/0$/, "").replace(".", ",");
  return einheit ? `${zahl} ${einheit}` : zahl;
}

export function datumAnzeige(datum: Date): string {
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${zweistellig(datum.getDate())}.${zweistellig(datum.getMonth() + 1)}.${datum.getFullYear()}`;
}

/// Behandlungsdauer in Tagen, einschließlich Anfangs- und Endtag.
export function dauerInTagen(datum: Date, endeDatum: Date | null): number {
  if (!endeDatum) return 1;
  const millisekundenJeTag = 24 * 60 * 60 * 1000;
  const tage = Math.round((endeDatum.getTime() - datum.getTime()) / millisekundenJeTag) + 1;
  return tage > 0 ? tage : 1;
}

export function dauerAnzeige(datum: Date, endeDatum: Date | null): string {
  const tage = dauerInTagen(datum, endeDatum);
  return tage === 1 ? "1 Tag" : `${tage} Tage`;
}

/// Kurzbezeichnung eines Medikaments für Tabellen: Name plus Charge, sofern
/// vorhanden. Die Charge ist rechtlich nicht gefordert, hilft aber bei einem
/// Rückruf sofort weiterzuwissen, welche Völker betroffen waren.
export function medikamentKurz(medikament: {
  name: string;
  chargennummer?: string | null;
}): string {
  return medikament.chargennummer
    ? `${medikament.name} (Ch. ${medikament.chargennummer})`
    : medikament.name;
}

/// Angaben, die für einen rechtssicheren Nachweis am Medikament stehen müssen
/// (Erwerbsnachweis nach § 1 Abs. 2 THAMNV, Belegnummer nach § 2 Nr. 3).
/// Liefert die fehlenden Angaben als Klartext - leer heißt vollständig. Alte
/// Datensätze ohne Lieferant/Belegnummer gelten damit als "unvollständig",
/// bleiben aber les- und nutzbar.
export function fehlendeMedikamentAngaben(medikament: {
  lieferant: string | null;
  belegnummer: string | null;
  anzahlBelege: number;
}): string[] {
  const fehlt: string[] = [];
  if (!medikament.lieferant?.trim()) fehlt.push("Lieferant");
  if (!medikament.belegnummer?.trim()) fehlt.push("Belegnummer");
  if (medikament.anzahlBelege === 0) fehlt.push("Beleg (Foto oder PDF)");
  return fehlt;
}

/// Wartezeit-Ende: Honig darf frühestens an diesem Tag entnommen werden.
/// Bei Langzeitbehandlungen zählt die Wartezeit ab dem Ende der Behandlung.
export function honigFruehestens(datum: Date, endeDatum: Date | null, wartezeitTage: number): Date {
  const ergebnis = new Date(endeDatum ?? datum);
  ergebnis.setDate(ergebnis.getDate() + wartezeitTage);
  return ergebnis;
}
