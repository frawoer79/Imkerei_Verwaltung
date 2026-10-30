"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BEREICHE } from "@/lib/bereiche";

// Einstellungen -> Bereiche: angehakt = sichtbar. Gespeichert wird, was
// NICHT angehakt ist. Die Daten der ausgeblendeten Bereiche bleiben erhalten.
export async function bereicheSpeichern(formData: FormData) {
  const an = new Set(formData.getAll("an").map(String));
  const abgeschaltet = BEREICHE.map((b) => b.schluessel).filter((s) => !an.has(s));

  await prisma.bereichswahl.upsert({
    where: { id: "standard" },
    create: { id: "standard", abgeschaltet },
    update: { abgeschaltet },
  });

  // Menü, Startseite, Stand- und Volk-Seiten hängen davon ab.
  revalidatePath("/", "layout");
}
