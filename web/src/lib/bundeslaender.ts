import { prisma } from "@/lib/prisma";

// Kürzel nach ISO 3166-2:DE, gespeichert in Betrieb.bundesland.
export const BUNDESLAENDER = [
  { kuerzel: "BW", name: "Baden-Württemberg" },
  { kuerzel: "BY", name: "Bayern" },
  { kuerzel: "BE", name: "Berlin" },
  { kuerzel: "BB", name: "Brandenburg" },
  { kuerzel: "HB", name: "Bremen" },
  { kuerzel: "HH", name: "Hamburg" },
  { kuerzel: "HE", name: "Hessen" },
  { kuerzel: "MV", name: "Mecklenburg-Vorpommern" },
  { kuerzel: "NI", name: "Niedersachsen" },
  { kuerzel: "NW", name: "Nordrhein-Westfalen" },
  { kuerzel: "RP", name: "Rheinland-Pfalz" },
  { kuerzel: "SL", name: "Saarland" },
  { kuerzel: "SN", name: "Sachsen" },
  { kuerzel: "ST", name: "Sachsen-Anhalt" },
  { kuerzel: "SH", name: "Schleswig-Holstein" },
  { kuerzel: "TH", name: "Thüringen" },
] as const;

export function istBundesland(wert: string): boolean {
  return BUNDESLAENDER.some((land) => land.kuerzel === wert);
}

// Die Velutina-Meldungen kommen nur von der LUBW, also aus Baden-Württemberg.
// "bw" = Karte und Warnungen, "anderes" = nichts davon (nur die Nestsuche),
// "unbekannt" = Bundesland nicht eingetragen: wie BW, dazu ein Hinweis.
export type LubwLage = "bw" | "anderes" | "unbekannt";

export async function lubwLage(): Promise<LubwLage> {
  const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" }, select: { bundesland: true } });
  if (!betrieb?.bundesland) return "unbekannt";
  return betrieb.bundesland === "BW" ? "bw" : "anderes";
}
