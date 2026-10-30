// Warenwert im Lager (freiwillig, Einstellungen -> Lager). Wie ein Imker
// verkauft: Gläser und andere feste Gebinde haben einen Preis je Stück, je
// Sorte verschieden (Waldhonig Glas 500 g = 9,00 €, Glas 250 g = 6,00 €).
// Eimer, Hobbocks und lose Menge rechnen je kg (bzw. je Einheit), ebenfalls
// je Sorte. Fehlt der Sortenpreis, gilt der Preis ohne Sorte (am Gebinde bzw.
// am Erzeugnis). Ohne Preis zählt der Posten nicht mit. Gemeinsam für
// Lager-Seite, Einlagern-Fenster und Lagerliste-PDF.
import { istEimerGebinde } from "@/lib/eimer";

export type PreisQuelle = {
  einheit: string;
  /// Preis je Einheit ohne Sorte.
  preis: number | null;
  /// `preis` = je Stück ohne Sorte.
  gebinde: { id: string; name: string; preis: number | null }[];
  sorten: { id: string; preis: number | null; gebindePreise: { gebindeId: string; preis: number }[] }[];
};

export type PostenMitMenge = { sorteId: string | null; gebindeId: string | null; anzahl: number | null; menge: number };

export type PostenWert = { wert: number; rechnung: string };

export type GefundenerPreis = { preis: number; je: "stueck" | "einheit" };

const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function euro(betrag: number): string {
  return EURO.format(betrag);
}

// Preis fürs Eingabefeld: 4.5 -> "4,50", leer bleibt leer.
export function preisFeld(preis: number | null | undefined): string {
  return preis === null || preis === undefined
    ? ""
    : preis.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function aufCent(betrag: number): number {
  return Math.round(betrag * 100) / 100;
}

function mengeText(menge: number): string {
  return menge.toLocaleString("de-DE", { maximumFractionDigits: 3 });
}

// Wird dieses Gebinde je Stück bewertet? Gläser und Sonstiges ja, Eimer und
// Hobbocks nicht (Inhalt schwankt, Preis je kg).
export function jeStueck(gebinde: { name: string } | null | undefined): boolean {
  return Boolean(gebinde && !istEimerGebinde(gebinde.name));
}

// Preis für Sorte + Gebinde, wie er gerade gilt (mit Rückfall ohne Sorte).
export function preisFuer(typ: PreisQuelle, sorteId: string | null, gebindeId: string | null): GefundenerPreis | null {
  const sorte = sorteId ? typ.sorten.find((eintrag) => eintrag.id === sorteId) : undefined;
  const gebinde = gebindeId ? typ.gebinde.find((eintrag) => eintrag.id === gebindeId) : undefined;
  if (gebinde && jeStueck(gebinde)) {
    const stueck =
      sorte?.gebindePreise.find((eintrag) => eintrag.gebindeId === gebinde.id)?.preis ?? gebinde.preis ?? null;
    if (stueck !== null) return { preis: stueck, je: "stueck" };
  }
  const einheit = sorte?.preis ?? typ.preis;
  return einheit === null ? null : { preis: einheit, je: "einheit" };
}

export function postenWert(posten: PostenMitMenge, typ: PreisQuelle): PostenWert | null {
  const gefunden = preisFuer(typ, posten.sorteId, posten.gebindeId);
  if (!gefunden) return null;
  if (gefunden.je === "stueck" && posten.anzahl !== null) {
    return { wert: aufCent(posten.anzahl * gefunden.preis), rechnung: `${posten.anzahl} × ${euro(gefunden.preis)}` };
  }
  return {
    wert: aufCent(posten.menge * gefunden.preis),
    rechnung: `${mengeText(posten.menge)} ${typ.einheit} × ${euro(gefunden.preis)}`,
  };
}

// Preis als kurzer Text, z.B. "9,00 €/Stück" oder "12,00 €/kg" (PDF).
export function preisText(typ: PreisQuelle, posten: PostenMitMenge): string {
  const gefunden = preisFuer(typ, posten.sorteId, posten.gebindeId);
  if (!gefunden) return "";
  return `${euro(gefunden.preis)}/${gefunden.je === "stueck" && posten.anzahl !== null ? "Stück" : typ.einheit}`;
}

// Summe mehrerer Posten und wie viele davon ohne Preis sind.
export function wertSumme(posten: PostenMitMenge[], typ: PreisQuelle): { wert: number; ohnePreis: number } {
  let wert = 0;
  let ohnePreis = 0;
  for (const eintrag of posten) {
    const ergebnis = postenWert(eintrag, typ);
    if (ergebnis) wert += ergebnis.wert;
    else ohnePreis += 1;
  }
  return { wert: aufCent(wert), ohnePreis };
}
