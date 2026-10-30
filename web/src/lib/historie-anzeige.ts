import { basisPrisma, prisma } from "@/lib/prisma";

// Anzeige der Historie (lib/historie.ts): Namen der Bereiche, kurze
// Beschreibung eines Datensatzes, geänderte Felder.

export const MODELL_NAMEN: Record<string, string> = {
  stockkartenEintrag: "Durchsicht",
  massnahme: "Maßnahme",
  behandlung: "Behandlung",
  behandlungVolk: "Behandlung (Volk)",
  bioVerfahren: "Verfahren ohne Medikament",
  bioVerfahrenVolk: "Verfahren (Volk)",
  volk: "Volk",
  bienenstand: "Bienenstand",
  koenigin: "Königin",
  koeniginEreignis: "Königin-Ereignis",
  zuchtserie: "Zuchtserie",
  zuchtkarte: "Zuchtkarte",
  belegstelle: "Belegstelle",
  bild: "Foto",
  dokument: "Dokument",
  medikament: "Medikament",
  medikamentBeleg: "Medikament-Beleg",
  erzeugnisBuchung: "Lagerbuchung",
  eimer: "Eimer",
  materialartikel: "Material",
  honigraumaufsatz: "Honigraum",
  honigernteAnteil: "Honigernte",
  lagerort: "Lagerort",
  sorte: "Sorte",
  gebinde: "Gebinde",
  beutensystem: "Beutensystem",
  zarge: "Zarge",
  nutzer: "Helfer-Zugang",
  nachweisDatei: "Nachweis-PDF",
  lagerlisteDatei: "Lagerliste-PDF",
};

export function modellName(modell: string): string {
  return MODELL_NAMEN[modell] ?? modell;
}

export const AKTION_TEXT: Record<string, string> = {
  angelegt: "angelegt",
  geaendert: "geändert",
  geloescht: "gelöscht",
};

type Zeile = Record<string, unknown>;

// Kurzer Name eines Datensatzes für die Liste, etwa der Text einer Maßnahme.
export function kurzbeschreibung(zeile: Zeile | null): string | null {
  if (!zeile) return null;
  for (const feld of ["name", "text", "kennung", "titel", "bezeichnung", "originalDateiname", "notizen"]) {
    const wert = zeile[feld];
    if (typeof wert === "string" && wert.trim() !== "") return wert.length > 60 ? `${wert.slice(0, 60)} …` : wert;
  }
  return null;
}

// Felder, die sich bei jeder Änderung von selbst mitändern.
const UNWICHTIG = new Set(["id", "createdAt", "updatedAt", "erstelltAm", "geaendertAm"]);

function wertText(wert: unknown): string {
  if (wert === null || wert === undefined || wert === "") return "leer";
  if (wert === true) return "ja";
  if (wert === false) return "nein";
  if (typeof wert === "string" && /^\d{4}-\d{2}-\d{2}T/.test(wert)) {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(wert));
  }
  if (typeof wert === "object") return JSON.stringify(wert);
  return String(wert);
}

// Bei "geändert" nur die Felder, die sich unterscheiden; sonst alle mit Inhalt.
export function felder(vorher: Zeile | null, nachher: Zeile | null): { feld: string; alt?: string; neu?: string }[] {
  const schluessel = new Set([...Object.keys(vorher ?? {}), ...Object.keys(nachher ?? {})]);
  const ergebnis: { feld: string; alt?: string; neu?: string }[] = [];
  for (const feld of schluessel) {
    if (UNWICHTIG.has(feld)) continue;
    const alt = vorher?.[feld];
    const neu = nachher?.[feld];
    if (vorher && nachher) {
      if (JSON.stringify(alt) === JSON.stringify(neu)) continue;
      ergebnis.push({ feld, alt: wertText(alt), neu: wertText(neu) });
    } else {
      const wert = nachher ? neu : alt;
      if (wert === null || wert === undefined || wert === "" || wert === false) continue;
      ergebnis.push({ feld, [nachher ? "neu" : "alt"]: wertText(wert) });
    }
  }
  return ergebnis;
}

// Gibt es überhaupt Helfer? Nur dann lohnt "von ..." an den Einträgen.
export async function helferVorhanden(): Promise<boolean> {
  try {
    return (await basisPrisma.nutzer.count()) > 0;
  } catch {
    return false;
  }
}

// Wer hat diese Datensätze angelegt? Einträge von vor Einführung der
// Historie fehlen in der Antwort.
export async function erstellerNamen(modell: string, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const eintraege = await prisma.historie.findMany({
    where: { modell, aktion: "angelegt", datensatzId: { in: ids } },
    select: { datensatzId: true, nutzerName: true },
  });
  return new Map(eintraege.map((eintrag) => [eintrag.datensatzId as string, eintrag.nutzerName]));
}
