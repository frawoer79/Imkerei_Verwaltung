import { prisma } from "@/lib/prisma";
import { koeniginZeile } from "@/lib/koeniginnen";
import type { Auswahlen } from "@/components/koenigin-formular";

/// Alles, was das Königin-Formular zur Auswahl anbietet: Belegstellen, Stände,
/// Völker und mögliche Mütter. Bewusst zusammen geladen - die Listen sind
/// klein und werden im Formular immer alle gebraucht.
export async function auswahlenLaden(): Promise<Auswahlen> {
  const [belegstellen, bienenstaende, voelker, muetter] = await Promise.all([
    prisma.belegstelle.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.bienenstand.findMany({
      where: { archiviert: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.volk.findMany({
      where: { archiviert: false },
      orderBy: [{ bienenstand: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, bienenstand: { select: { name: true } } },
    }),
    // Auch abgegangene Königinnen bleiben als Mutter wählbar - die Abstammung
    // ihrer Töchter darf nicht davon abhängen, ob sie noch lebt.
    prisma.koenigin.findMany({
      orderBy: [{ jahrgang: "desc" }, { kennung: "asc" }],
      select: {
        id: true,
        kennung: true,
        stern: true,
        rasse: true,
        jahrgang: true,
        begattungsart: true,
        belegstelle: { select: { name: true } },
        begattungsStand: { select: { name: true } },
      },
    }),
  ]);

  return {
    belegstellen,
    bienenstaende,
    voelker: voelker.map((volk) => ({
      id: volk.id,
      name: volk.name,
      standName: volk.bienenstand.name,
    })),
    muetter: muetter.map((mutter) => ({
      id: mutter.id,
      // In einer Auswahlliste lässt sich kein farbiges Symbol zeigen, daher
      // dort das Schriftzeichen.
      kennung: mutter.stern ? `${mutter.kennung} ★` : mutter.kennung,
      beschreibung: koeniginZeile(mutter),
    })),
  };
}

/// Datumswert für <input type="date"> - lokales Datum, ohne Zeitzonensprung
/// wie bei toISOString().
export function alsDatumWert(datum: Date | null | undefined): string {
  if (!datum) return "";
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}
