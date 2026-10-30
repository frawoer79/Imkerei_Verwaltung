"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MARKIERUNGSFARBEN, TOLERANZEN_GRAD } from "@/lib/nestsuche";

// Speichern zur Velutina-Nestsuche. Jede Änderung lädt die Seite der Suche
// neu, die Karte rechnet daraus Korridore und Schnittbereich.

function koordinaten(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function neuLaden(sucheId: string) {
  revalidatePath(`/velutina/nestsuche/${sucheId}`);
  revalidatePath("/velutina/nestsuche");
}

async function sucheVonLocktopf(locktopfId: string): Promise<string | null> {
  const locktopf = await prisma.velutinaLocktopf.findUnique({ where: { id: locktopfId }, select: { sucheId: true } });
  return locktopf?.sucheId ?? null;
}

async function sucheVonBeobachtung(beobachtungId: string): Promise<string | null> {
  const beobachtung = await prisma.velutinaFlugbeobachtung.findUnique({
    where: { id: beobachtungId },
    select: { locktopf: { select: { sucheId: true } } },
  });
  return beobachtung?.locktopf.sucheId ?? null;
}

export async function nestsucheAnlegen(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const suche = await prisma.velutinaNestsuche.create({
    data: { name: name || `Nestsuche ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" })}` },
  });
  revalidatePath("/velutina/nestsuche");
  redirect(`/velutina/nestsuche/${suche.id}`);
}

export async function nestsucheAendern(sucheId: string, name: string, notiz: string): Promise<void> {
  const sauber = name.trim().slice(0, 120);
  if (!sauber) return;
  await prisma.velutinaNestsuche.update({
    where: { id: sucheId },
    data: { name: sauber, notiz: notiz.trim().slice(0, 2000) || null },
  });
  neuLaden(sucheId);
}

export async function nestsucheLoeschen(sucheId: string): Promise<void> {
  await prisma.velutinaNestsuche.delete({ where: { id: sucheId } });
  revalidatePath("/velutina/nestsuche");
  redirect("/velutina/nestsuche");
}

/// Nest gefunden (mit Standort) oder Suche ohne Fund beenden.
export async function nestsucheAbschliessen(sucheId: string, nest: { lat: number; lng: number } | null): Promise<void> {
  if (nest && !koordinaten(nest.lat, nest.lng)) return;
  await prisma.velutinaNestsuche.update({
    where: { id: sucheId },
    data: {
      abgeschlossenAm: new Date(),
      nestBreitengrad: nest?.lat ?? null,
      nestLaengengrad: nest?.lng ?? null,
    },
  });
  neuLaden(sucheId);
}

export async function nestsucheWiederAufnehmen(sucheId: string): Promise<void> {
  await prisma.velutinaNestsuche.update({
    where: { id: sucheId },
    data: { abgeschlossenAm: null, nestBreitengrad: null, nestLaengengrad: null, archiviertAm: null },
  });
  neuLaden(sucheId);
}

/// Nur abgeschlossene Suchen lassen sich archivieren.
export async function nestsucheArchivieren(sucheId: string): Promise<void> {
  await prisma.velutinaNestsuche.updateMany({
    where: { id: sucheId, abgeschlossenAm: { not: null } },
    data: { archiviertAm: new Date() },
  });
  neuLaden(sucheId);
}

export async function nestsucheAusArchiv(sucheId: string): Promise<void> {
  await prisma.velutinaNestsuche.update({ where: { id: sucheId }, data: { archiviertAm: null } });
  neuLaden(sucheId);
}

export async function locktopfAnlegen(sucheId: string, lat: number, lng: number): Promise<void> {
  if (!koordinaten(lat, lng)) return;
  const anzahl = await prisma.velutinaLocktopf.count({ where: { sucheId } });
  await prisma.velutinaLocktopf.create({
    data: { sucheId, name: `Locktopf ${anzahl + 1}`, breitengrad: lat, laengengrad: lng },
  });
  neuLaden(sucheId);
}

export async function locktopfVerschieben(locktopfId: string, lat: number, lng: number): Promise<void> {
  if (!koordinaten(lat, lng)) return;
  const locktopf = await prisma.velutinaLocktopf.update({
    where: { id: locktopfId },
    data: { breitengrad: lat, laengengrad: lng },
  });
  neuLaden(locktopf.sucheId);
}

export async function locktopfUmbenennen(locktopfId: string, name: string): Promise<void> {
  const sauber = name.trim().slice(0, 80);
  if (!sauber) return;
  const locktopf = await prisma.velutinaLocktopf.update({ where: { id: locktopfId }, data: { name: sauber } });
  neuLaden(locktopf.sucheId);
}

export async function locktopfLoeschen(locktopfId: string): Promise<void> {
  const locktopf = await prisma.velutinaLocktopf.delete({ where: { id: locktopfId } });
  neuLaden(locktopf.sucheId);
}

export async function beobachtungAnlegen(locktopfId: string): Promise<void> {
  const sucheId = await sucheVonLocktopf(locktopfId);
  if (!sucheId) return;
  // Nächste in dieser Suche noch nicht benutzte Farbe vorschlagen, damit
  // sich die Korridore auf der Karte unterscheiden.
  const vorhandene = await prisma.velutinaFlugbeobachtung.findMany({
    where: { locktopf: { sucheId } },
    select: { farbe: true },
  });
  const frei = MARKIERUNGSFARBEN.find((eintrag) => !vorhandene.some((b) => b.farbe === eintrag.farbe)) ?? MARKIERUNGSFARBEN[0];
  await prisma.velutinaFlugbeobachtung.create({ data: { locktopfId, markierung: frei.name, farbe: frei.farbe } });
  neuLaden(sucheId);
}

export async function beobachtungAendern(
  beobachtungId: string,
  daten: {
    markierung?: string;
    farbe?: string;
    richtungGrad?: number | null;
    richtungQuelle?: "KARTE" | "KOMPASS" | null;
    toleranzGrad?: number;
    notiz?: string;
  },
): Promise<void> {
  const sucheId = await sucheVonBeobachtung(beobachtungId);
  if (!sucheId) return;
  const aenderung: Record<string, unknown> = {};
  if (daten.markierung !== undefined && daten.markierung.trim()) aenderung.markierung = daten.markierung.trim().slice(0, 40);
  if (daten.farbe !== undefined && /^#[0-9a-f]{6}$/i.test(daten.farbe)) aenderung.farbe = daten.farbe;
  if (daten.richtungGrad !== undefined) {
    aenderung.richtungGrad =
      daten.richtungGrad === null || !Number.isFinite(daten.richtungGrad)
        ? null
        : ((daten.richtungGrad % 360) + 360) % 360;
  }
  if (daten.richtungQuelle !== undefined) aenderung.richtungQuelle = daten.richtungQuelle;
  if (daten.toleranzGrad !== undefined && (TOLERANZEN_GRAD as readonly number[]).includes(daten.toleranzGrad)) {
    aenderung.toleranzGrad = daten.toleranzGrad;
  }
  if (daten.notiz !== undefined) aenderung.notiz = daten.notiz.trim().slice(0, 1000) || null;
  await prisma.velutinaFlugbeobachtung.update({ where: { id: beobachtungId }, data: aenderung });
  neuLaden(sucheId);
}

/// Stoppuhr: Abflug merken (Zeitpunkt vom Handy, damit Hin- und Rückweg
/// mit derselben Uhr gemessen werden) oder abbrechen (null).
export async function abflugSetzen(beobachtungId: string, zeitpunktMs: number | null): Promise<void> {
  const sucheId = await sucheVonBeobachtung(beobachtungId);
  if (!sucheId) return;
  await prisma.velutinaFlugbeobachtung.update({
    where: { id: beobachtungId },
    data: { abflugAm: zeitpunktMs === null || !Number.isFinite(zeitpunktMs) ? null : new Date(zeitpunktMs) },
  });
  neuLaden(sucheId);
}

/// Rundzeit anhängen (gestoppt oder von Hand), beendet eine laufende Stoppuhr.
export async function rundzeitHinzufuegen(beobachtungId: string, sekunden: number): Promise<void> {
  const sucheId = await sucheVonBeobachtung(beobachtungId);
  if (!sucheId) return;
  const sauber = Math.round(sekunden);
  if (!Number.isFinite(sauber) || sauber < 1 || sauber > 3 * 3600) return;
  const beobachtung = await prisma.velutinaFlugbeobachtung.findUnique({
    where: { id: beobachtungId },
    select: { rundzeitenSek: true },
  });
  if (!beobachtung) return;
  await prisma.velutinaFlugbeobachtung.update({
    where: { id: beobachtungId },
    data: { rundzeitenSek: [...beobachtung.rundzeitenSek, sauber], abflugAm: null },
  });
  neuLaden(sucheId);
}

export async function rundzeitEntfernen(beobachtungId: string, index: number): Promise<void> {
  const sucheId = await sucheVonBeobachtung(beobachtungId);
  if (!sucheId) return;
  const beobachtung = await prisma.velutinaFlugbeobachtung.findUnique({
    where: { id: beobachtungId },
    select: { rundzeitenSek: true },
  });
  if (!beobachtung || index < 0 || index >= beobachtung.rundzeitenSek.length) return;
  await prisma.velutinaFlugbeobachtung.update({
    where: { id: beobachtungId },
    data: { rundzeitenSek: beobachtung.rundzeitenSek.filter((_, i) => i !== index) },
  });
  neuLaden(sucheId);
}

export async function beobachtungLoeschen(beobachtungId: string): Promise<void> {
  const sucheId = await sucheVonBeobachtung(beobachtungId);
  if (!sucheId) return;
  await prisma.velutinaFlugbeobachtung.delete({ where: { id: beobachtungId } });
  neuLaden(sucheId);
}
