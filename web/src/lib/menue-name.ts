import { prisma } from "@/lib/prisma";

export const MENUE_NAME_STANDARD = "Imkereiverwaltung";

// Name neben dem Logo im Menü, unter Einstellungen -> Bienenhalter frei
// wählbar. Jeder Testzugang hat sein eigenes Schema und damit seinen eigenen.
export async function menueName(): Promise<string> {
  try {
    const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" }, select: { menueName: true } });
    return betrieb?.menueName?.trim() || MENUE_NAME_STANDARD;
  } catch {
    // Das Menü darf nie die ganze Seite mitreißen (Datenbank beim Hochfahren).
    return MENUE_NAME_STANDARD;
  }
}
