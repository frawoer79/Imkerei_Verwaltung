"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { BioVerfahrenArt } from "@/generated/prisma/enums";
import {
  BANNWABE_VARIANTEN,
  BIO_VERFAHREN_ARTEN,
  betrifftKoenigin,
  schrittDatum,
  schrittText,
  verbleibOptionen,
  verfahrenSchritte,
} from "@/lib/bio-verfahren";

// Speichern biotechnischer Verfahren (siehe lib/bio-verfahren.ts). Anders als
// eine Behandlung mit Medikament bleibt ein Verfahren änderbar und lässt sich
// löschen - es gehört nicht ins Bestandsbuch.

function text(formData: FormData, name: string): string | null {
  const wert = (formData.get(name) ?? "").toString().trim();
  return wert === "" ? null : wert;
}

function ganzzahl(formData: FormData, name: string): number | null {
  const wert = text(formData, name);
  if (wert === null) return null;
  const zahl = Number(wert);
  return Number.isInteger(zahl) && zahl >= 0 ? zahl : null;
}

const datumAnzeige = (datum: Date) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(datum);

/// Felder, die Anlegen und Ändern gemeinsam haben. Art und Völker stehen
/// nach dem Anlegen fest.
function felderAusFormular(formData: FormData, art: BioVerfahrenArt) {
  const beginnRoh = text(formData, "beginn");
  const anwender = text(formData, "anwender");
  const bezeichnung = art === "SONSTIGES" ? text(formData, "bezeichnung") : null;
  if (!beginnRoh || !anwender || (art === "SONSTIGES" && !bezeichnung)) {
    return {
      fehler:
        art === "SONSTIGES"
          ? "Nicht gespeichert. Es fehlen Beginn, Anwender oder was gemacht wurde."
          : "Nicht gespeichert. Es fehlen Beginn oder Anwender.",
    } as const;
  }
  const verbleib = text(formData, "verbleib");
  const brutentnahme = art === "TBE" || art === "TEIL_BRUTENTNAHME";
  return {
    daten: {
      bezeichnung,
      beginn: new Date(beginnRoh),
      anwender,
      bemerkung: text(formData, "bemerkung"),
      brutwaben: brutentnahme ? ganzzahl(formData, "brutwaben") : null,
      verbleib: verbleib && verbleibOptionen(art).includes(verbleib) ? verbleib : null,
      fangwabe: art === "TBE" && formData.get("fangwabe") === "ja",
      kaefig: betrifftKoenigin(art) ? text(formData, "kaefig") : null,
      inMassnahmen: formData.get("inMassnahmen") === "ja",
      bannwabeVariante: art === "BANNWABE" ? BANNWABE_VARIANTEN.find((eintrag) => eintrag === text(formData, "bannwabeVariante")) ?? null : null,
    },
  } as const;
}

function lebenslaufNotiz(art: BioVerfahrenArt, beginn: Date, bannwabeVariante: string | null): string {
  const schritte = verfahrenSchritte(art, { bannwabeVariante });
  const frei = schritte.find((schritt) => schritt.schluessel === "KOENIGIN_FREI");
  const bis = frei ? ` bis ${datumAnzeige(schrittDatum(beginn, frei.tag))}` : "";
  return art === "KOENIGIN_KAEFIGEN"
    ? `Für die Brutpause gekäfigt${bis}.`
    : `Bannwabenverfahren: auf Bannwaben gesperrt${bis}.`;
}

/// Bringt die Maßnahmen eines Verfahrens auf den Stand seines Fahrplans:
/// offene Schritte bekommen den neuen Termin, fehlende kommen dazu, Schritte,
/// die es nicht mehr gibt, fallen weg (erledigte bleiben stehen).
async function fahrplanAbgleichen(verfahrenId: string, erledigtBeimAnlegen: string[] = []) {
  const verfahren = await prisma.bioVerfahren.findUniqueOrThrow({
    where: { id: verfahrenId },
    include: {
      voelker: { select: { volkId: true } },
      massnahmen: { select: { id: true, volkId: true, bioSchritt: true, erledigt: true } },
    },
  });
  const schritte = verfahrenSchritte(verfahren.art, verfahren);

  const ueberzaehlig = verfahren.massnahmen.filter(
    (massnahme) => !massnahme.erledigt && !schritte.some((schritt) => schritt.schluessel === massnahme.bioSchritt)
  );
  if (ueberzaehlig.length > 0) {
    await prisma.massnahme.deleteMany({ where: { id: { in: ueberzaehlig.map((massnahme) => massnahme.id) } } });
  }

  const neu = [];
  for (const schritt of schritte) {
    const faelligAm = schrittDatum(verfahren.beginn, schritt.tag);
    const textNeu = schrittText(verfahren.art, verfahren.bezeichnung, schritt);
    await prisma.massnahme.updateMany({
      where: { bioVerfahrenId: verfahrenId, bioSchritt: schritt.schluessel, erledigt: false },
      data: { faelligAm, text: textNeu },
    });
    for (const { volkId } of verfahren.voelker) {
      if (verfahren.massnahmen.some((massnahme) => massnahme.volkId === volkId && massnahme.bioSchritt === schritt.schluessel)) {
        continue;
      }
      const erledigt = erledigtBeimAnlegen.includes(schritt.schluessel);
      neu.push({
        volkId,
        text: textNeu,
        faelligAm,
        erledigt,
        erledigtAm: erledigt ? faelligAm : null,
        bioVerfahrenId: verfahrenId,
        bioSchritt: schritt.schluessel,
      });
    }
  }
  if (neu.length > 0) await prisma.massnahme.createManyAndReturn({ data: neu });
}

async function pfadeNeuLaden(verfahrenId: string, volkIds: string[]) {
  revalidatePath("/behandlungen", "layout");
  revalidatePath("/massnahmen");
  revalidatePath("/koeniginnen", "layout");
  const voelker = await prisma.volk.findMany({ where: { id: { in: volkIds } }, select: { id: true, bienenstandId: true } });
  for (const volk of voelker) {
    revalidatePath(`/voelker/${volk.id}`);
    revalidatePath(`/bienenstaende/${volk.bienenstandId}`);
  }
  revalidatePath(`/behandlungen/verfahren/${verfahrenId}`);
}

export async function bioVerfahrenAnlegen(formData: FormData): Promise<{ fehler?: string }> {
  const artRoh = text(formData, "art");
  const art = BIO_VERFAHREN_ARTEN.find((eintrag) => eintrag === artRoh);
  const volkIds = formData.getAll("volkIds").map((wert) => wert.toString()).filter(Boolean);
  if (!art) return { fehler: "Nicht gespeichert. Bitte ein Verfahren wählen." };
  if (volkIds.length === 0) return { fehler: "Nicht gespeichert. Bitte mindestens ein Volk wählen." };

  const felder = felderAusFormular(formData, art);
  if ("fehler" in felder) return { fehler: felder.fehler };

  const voelker = await prisma.volk.findMany({
    where: { id: { in: volkIds } },
    select: { id: true, name: true, koeniginId: true, bienenstand: { select: { name: true } } },
  });

  const verfahren = await prisma.bioVerfahren.create({
    data: {
      art,
      ...felder.daten,
      voelker: {
        create: voelker.map((volk) => ({
          volkId: volk.id,
          volkNameDamals: volk.name,
          standNameDamals: volk.bienenstand.name,
        })),
      },
    },
  });

  const erledigt = formData.getAll("erledigt").map((wert) => wert.toString());
  await fahrplanAbgleichen(verfahren.id, erledigt);

  // Käfigen und Bannwabe setzen die Königin fest: das gehört in ihren
  // Lebenslauf. Als "Sonstiges", damit sich ihr Verbleib nicht ändert.
  if (betrifftKoenigin(art)) {
    const mitKoenigin = voelker.filter((volk) => volk.koeniginId);
    if (mitKoenigin.length > 0) {
      await prisma.koeniginEreignis.createManyAndReturn({
        data: mitKoenigin.map((volk) => ({
          koeniginId: volk.koeniginId!,
          datum: felder.daten.beginn,
          art: "SONSTIGES" as const,
          volkId: volk.id,
          notiz: lebenslaufNotiz(art, felder.daten.beginn, felder.daten.bannwabeVariante),
          bioVerfahrenId: verfahren.id,
        })),
      });
    }
  }

  await pfadeNeuLaden(verfahren.id, volkIds);

  const zurueckZuVolk = formData.get("zurueckZuVolk")?.toString();
  if (zurueckZuVolk && voelker.some((volk) => volk.id === zurueckZuVolk)) {
    redirect(`/voelker/${zurueckZuVolk}`);
  }
  redirect(`/behandlungen/verfahren/${verfahren.id}`);
}

export async function bioVerfahrenAendern(verfahrenId: string, formData: FormData): Promise<{ fehler?: string }> {
  const bisher = await prisma.bioVerfahren.findUniqueOrThrow({
    where: { id: verfahrenId },
    select: { art: true, voelker: { select: { volkId: true } } },
  });
  const felder = felderAusFormular(formData, bisher.art);
  if ("fehler" in felder) return { fehler: felder.fehler };

  await prisma.bioVerfahren.update({ where: { id: verfahrenId }, data: felder.daten });
  await fahrplanAbgleichen(verfahrenId);
  if (betrifftKoenigin(bisher.art)) {
    await prisma.koeniginEreignis.updateMany({
      where: { bioVerfahrenId: verfahrenId },
      data: { datum: felder.daten.beginn, notiz: lebenslaufNotiz(bisher.art, felder.daten.beginn, felder.daten.bannwabeVariante) },
    });
  }

  await pfadeNeuLaden(verfahrenId, bisher.voelker.map((eintrag) => eintrag.volkId));
  redirect(`/behandlungen/verfahren/${verfahrenId}`);
}

export async function bioVerfahrenLoeschen(verfahrenId: string) {
  const verfahren = await prisma.bioVerfahren.findUniqueOrThrow({
    where: { id: verfahrenId },
    select: { voelker: { select: { volkId: true } } },
  });
  // Maßnahmen und Lebenslauf-Einträge gehen mit (Cascade), Behandlungen mit
  // Medikament bleiben als Nachweis stehen und verlieren nur den Verweis.
  await prisma.bioVerfahren.delete({ where: { id: verfahrenId } });
  await pfadeNeuLaden(verfahrenId, verfahren.voelker.map((eintrag) => eintrag.volkId));
  redirect("/behandlungen");
}

/// Einen Schritt für alle Völker des Verfahrens abhaken oder wieder öffnen.
export async function bioSchrittSetzen(verfahrenId: string, schluessel: string, erledigt: boolean) {
  const massnahmen = await prisma.massnahme.findMany({
    where: { bioVerfahrenId: verfahrenId, bioSchritt: schluessel },
    select: { volkId: true },
  });
  await prisma.massnahme.updateMany({
    where: { bioVerfahrenId: verfahrenId, bioSchritt: schluessel },
    data: { erledigt, erledigtAm: erledigt ? new Date() : null },
  });
  await pfadeNeuLaden(verfahrenId, massnahmen.map((massnahme) => massnahme.volkId));
}
