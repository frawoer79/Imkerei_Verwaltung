"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { aktuellesKonto } from "@/lib/konto";
import { velutinaAbgleich } from "@/lib/velutina";
import { AKUT_MAX_M, AKUT_MIN_M, WARN_MAX_M, WARN_MIN_M } from "@/lib/velutina-daten";

function begrenzt(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(wert)));
}

// Akut- und Warnbereich um die Stände. Der Warnbereich ist immer mindestens
// so groß wie der Akutbereich.
export async function velutinaRadienSpeichern(akutRadiusM: number, warnRadiusM: number): Promise<void> {
  if (!Number.isFinite(akutRadiusM) || !Number.isFinite(warnRadiusM)) return;
  const akut = begrenzt(akutRadiusM, AKUT_MIN_M, AKUT_MAX_M);
  const warn = Math.max(akut, begrenzt(warnRadiusM, WARN_MIN_M, WARN_MAX_M));
  await prisma.velutinaEinstellung.upsert({
    where: { id: "standard" },
    create: { id: "standard", akutRadiusM: akut, warnRadiusM: warn },
    update: { akutRadiusM: akut, warnRadiusM: warn },
  });
  revalidatePath("/", "layout");
}

// Alle bisher aufgetauchten Meldungen gelten als gesehen - Hinweis auf der
// Startseite und Abzeichen im Menü verschwinden bis zur nächsten neuen.
export async function velutinaAlleGesehen(): Promise<void> {
  const jetzt = new Date();
  await prisma.velutinaEinstellung.upsert({
    where: { id: "standard" },
    create: { id: "standard", gesehenBis: jetzt },
    update: { gesehenBis: jetzt },
  });
  revalidatePath("/", "layout");
}

export async function velutinaMailUmschalten(an: boolean): Promise<void> {
  await prisma.velutinaEinstellung.upsert({
    where: { id: "standard" },
    create: { id: "standard", mailAn: an },
    update: { mailAn: an },
  });
  revalidatePath("/velutina");
}

export async function velutinaJetztAbrufen(): Promise<void> {
  // Nur angemeldet - der Abruf selbst betrifft alle Konten gleich.
  if (!(await aktuellesKonto())) return;
  await velutinaAbgleich();
  revalidatePath("/", "layout");
}
