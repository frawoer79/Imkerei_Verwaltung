// Gebinde-Gruppen und Größen-Namen - gemeinsam für das Einlagern-Fenster,
// Einstellungen -> Lager und das Speichern auf dem Server, damit eine Größe
// überall gleich heißt und in derselben Gruppe landet.

// Gruppe am Namen erkannt wie das Symbol, damit auch ältere, frei benannte
// Gebinde ("Glas 30 g", "Hobbock 40 kg") von selbst richtig landen.
export type GebindeArt = "eimer" | "glas" | "sonst";

export const GEBINDE_ARTEN: GebindeArt[] = ["eimer", "glas", "sonst"];

export const GEBINDE_ART_NAME: Record<GebindeArt, string> = { eimer: "Eimer", glas: "Gläser", sonst: "Sonstige" };

export function gebindeArt(name: string): GebindeArt {
  if (/glas/i.test(name)) return "glas";
  if (/eimer|hobbock/i.test(name)) return "eimer";
  return "sonst";
}

export function istGebindeArt(wert: unknown): wert is GebindeArt {
  return wert === "eimer" || wert === "glas" || wert === "sonst";
}

// "Glas 500 g" -> "500 g", "Eimer 25 kg" -> "25 kg"; andere Namen bleiben.
export function groesseKurz(name: string): string {
  return name.replace(/^(glas|eimer)\s+/i, "");
}

// Name einer neuen Größe: Wer bei Honig in der Gruppe Gläser nur "400 g"
// tippt, bekommt "Glas 400 g" - sonst fände sich die Größe nicht in ihrer
// Gruppe wieder. Passt der Name schon zur Gruppe, bleibt er, wie er ist.
export function gebindeNameVoll(eingabe: string, art: GebindeArt, honig: boolean): string {
  const name = eingabe.trim().replace(/\s+/g, " ");
  if (!name || !honig || art === "sonst" || gebindeArt(name) === art) return name;
  return `${art === "glas" ? "Glas" : "Eimer"} ${name}`;
}

// Übliche Honig-Gebinde, die sich unter "+ Größe" mit einem Tipp anlegen lassen.
export const HONIG_GROESSEN: Record<Exclude<GebindeArt, "sonst">, { name: string; inhalt: number }[]> = {
  glas: [
    { name: "Glas 30 g", inhalt: 0.03 },
    { name: "Glas 50 g", inhalt: 0.05 },
    { name: "Glas 125 g", inhalt: 0.125 },
    { name: "Glas 250 g", inhalt: 0.25 },
    { name: "Glas 500 g", inhalt: 0.5 },
    { name: "Glas 1000 g", inhalt: 1 },
  ],
  eimer: [
    { name: "Eimer 1 kg", inhalt: 1 },
    { name: "Eimer 2,5 kg", inhalt: 2.5 },
    { name: "Eimer 12,5 kg", inhalt: 12.5 },
    { name: "Eimer 25 kg", inhalt: 25 },
    { name: "Hobbock 40 kg", inhalt: 40 },
  ],
};

// Gebinde nach Gruppen, Größen aufsteigend. Bei Honig immer Eimer und
// Gläser, "Sonstige" nur wenn vorhanden oder `sonstigeImmer`; bei anderen
// Erzeugnissen ist alles eine Gruppe ("sonst").
export function gebindeGruppen<G extends { name: string; inhalt: number }>(
  gebinde: G[],
  honig: boolean,
  sonstigeImmer = false,
): { art: GebindeArt; gebinde: G[] }[] {
  return GEBINDE_ARTEN.map((art) => ({
    art,
    gebinde: gebinde
      .filter((eintrag) => (honig ? gebindeArt(eintrag.name) : "sonst") === art)
      .sort((a, b) => a.inhalt - b.inhalt),
  })).filter((gruppe) =>
    honig ? gruppe.art !== "sonst" || sonstigeImmer || gruppe.gebinde.length > 0 : gruppe.art === "sonst",
  );
}

// Gibt es diese Größe schon? Gleicher Name, oder bei Eimern und Gläsern
// gleiche Gruppe mit gleichem Inhalt ("Eimer 25 kg" und "Eimer 25kg").
export function gleichesGebinde(
  a: { name: string; inhalt: number },
  b: { name: string; inhalt: number },
  honig: boolean,
): boolean {
  if (Math.abs(a.inhalt - b.inhalt) >= 0.0005) return false;
  if (a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) return true;
  const art = gebindeArt(a.name);
  return honig && art !== "sonst" && art === gebindeArt(b.name);
}

// Wie die lose Menge ohne Gebinde heißt: bei kg und g "Gewicht", bei Stück,
// Liter und anderen Einheiten "Menge".
export function loseName(einheit: string): string {
  return /^(kg|g)$/i.test(einheit.trim()) ? "Gewicht" : "Menge";
}
