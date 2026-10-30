import { prisma } from "@/lib/prisma";

/// Was ein Stockkarteneintrag am Fütterer geändert hat. Der Zustand "Fütterer
/// liegt drauf" selbst wird nicht gespeichert, sondern ergibt sich aus der
/// letzten Aktion vor einem Zeitpunkt.
export type FuettererAktion = "AUFGESETZT" | "ABGENOMMEN";

export const FUETTERER_AKTION_LABEL: Record<FuettererAktion, string> = {
  AUFGESETZT: "aufgesetzt",
  ABGENOMMEN: "abgenommen",
};

/// Ein vorhandener Eintrag, vor dem der Stand gesucht wird (beim Bearbeiten).
/// Bei gleicher Uhrzeit (das Formular kennt nur Minuten) zählt die
/// Reihenfolge des Anlegens.
type VorEintrag = { id: string; createdAt: Date };

/// Liegt auf dem Volk zum Zeitpunkt `bis` ein Fütterer? Mit `vor` nur
/// Einträge, die vor diesem Eintrag liegen (er selbst zählt nicht mit).
export async function fuettererLiegtAuf(volkId: string, bis: Date, vor?: VorEintrag): Promise<boolean> {
  const letzter = await prisma.stockkartenEintrag.findFirst({
    where: {
      volkId,
      fuettererAktion: { not: null },
      ...(vor
        ? {
            id: { not: vor.id },
            OR: [{ datum: { lt: bis } }, { datum: bis, createdAt: { lt: vor.createdAt } }],
          }
        : { datum: { lte: bis } }),
    },
    orderBy: [{ datum: "desc" }, { createdAt: "desc" }],
    select: { fuettererAktion: true },
  });
  return letzter?.fuettererAktion === "AUFGESETZT";
}

/// Aus dem Haken "Fütterer aufgesetzt" die Aktion dieses Eintrags ableiten:
/// nur ein Wechsel gegenüber dem Stand davor wird festgehalten. Im Modus
/// "nurAufsetzen" (Sammel-Eintrag für mehrere Völker, deren Zustand
/// verschieden sein kann) bedeutet ein leerer Haken "keine Angabe" statt
/// "abgenommen".
export async function fuettererAktionAusFormular(
  formData: FormData,
  volkId: string,
  datum: Date,
  vor?: VorEintrag
): Promise<FuettererAktion | null> {
  const modus = formData.get("fuettererModus")?.toString();
  if (modus !== "zustand" && modus !== "nurAufsetzen") return null;
  const aufgesetzt = formData.get("fuettererAuf")?.toString() === "ja";
  const vorher = await fuettererLiegtAuf(volkId, datum, vor);
  if (aufgesetzt && !vorher) return "AUFGESETZT";
  if (!aufgesetzt && vorher && modus === "zustand") return "ABGENOMMEN";
  return null;
}
