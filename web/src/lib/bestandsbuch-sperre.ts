import { prisma } from "@/lib/prisma";

// Löschsperre fürs Bestandsbuch: Behandlungsnachweise müssen 5 Jahre
// aufbewahrt werden. Hängt ein Volk (oder ein Stand mit solchen Völkern) an
// Behandlungen, darf es nicht gelöscht werden - die Behandlungen würden sonst
// per Cascade still aus dem Nachweis verschwinden. Archivieren geht immer.

/// Anzahl der Behandlungen, in denen das Volk steht.
export async function behandlungenAmVolk(volkId: string): Promise<number> {
  return prisma.behandlungVolk.count({ where: { volkId } });
}

/// Anzahl der Behandlungen (je Behandlung einmal gezählt), in denen Völker
/// des Stands stehen.
export async function behandlungenAmStand(bienenstandId: string): Promise<number> {
  return prisma.behandlung.count({ where: { voelker: { some: { volk: { bienenstandId } } } } });
}

export function sperrtextVolk(anzahl: number): string {
  return `Löschen nicht möglich. Dieses Volk steht in ${
    anzahl === 1 ? "1 Behandlung" : `${anzahl} Behandlungen`
  } des Bestandsbuchs. Behandlungsnachweise müssen 5 Jahre aufbewahrt werden. Archiviere das Volk stattdessen. Die Stockkarte bleibt erhalten.`;
}

export function sperrtextStand(anzahl: number): string {
  return `Löschen nicht möglich. Völker dieses Stands stehen in ${
    anzahl === 1 ? "1 Behandlung" : `${anzahl} Behandlungen`
  } des Bestandsbuchs. Behandlungsnachweise müssen 5 Jahre aufbewahrt werden. Archiviere den Stand stattdessen. Völker, Stockkarten und Nachweise bleiben erhalten.`;
}
