"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { basisPrisma } from "@/lib/datenbank";
import { ADMIN_KONTO } from "@/lib/anmeldung";
import { istBundesland } from "@/lib/bundeslaender";
import { LAENGE } from "@/lib/eingabe-grenzen";
import { einrichtungNoetig, einrichtungscodePruefen, hauptzugangAnlegen } from "@/lib/hauptzugang";
import { sitzungSetzen } from "@/lib/sitzung";
import { pruefungMoeglich } from "@/lib/update";
import { PASSWORT_MINDESTLAENGE } from "@/lib/testzugang";

// Felder gehen zurück ans Formular, damit sie nach einem Fehler stehen
// bleiben. Passwörter und Code bewusst nicht.
export type EinrichtenState = {
  error: string | null;
  felder?: {
    halterName: string;
    menueName: string;
    bundesland: string;
    benutzername: string;
    updatePruefung: boolean;
  };
};

// Erster Start einer selbst installierten Instanz: Hauptzugang und die
// wichtigsten Angaben zum Betrieb anlegen, danach ist man gleich angemeldet.
export async function einrichten(_vorher: EinrichtenState, formData: FormData): Promise<EinrichtenState> {
  if (!(await einrichtungNoetig())) redirect("/login");

  const text = (name: string) => (formData.get(name) ?? "").toString().trim();
  const felder = {
    halterName: text("halterName"),
    menueName: text("menueName"),
    bundesland: text("bundesland"),
    benutzername: text("benutzername"),
    updatePruefung: formData.get("updatePruefung") === "an",
  };
  const code = text("code");
  const passwort = (formData.get("passwort") ?? "").toString();
  const passwortWiederholung = (formData.get("passwortWiederholung") ?? "").toString();

  if (!einrichtungscodePruefen(code)) {
    return { error: "Der Einrichtungscode stimmt nicht.", felder };
  }
  if (felder.halterName.length < 2 || felder.halterName.length > 80) {
    return { error: "Bitte deinen Namen eintragen.", felder };
  }
  if (felder.menueName.length > LAENGE.menueName) {
    return { error: `Der Name der Imkerei darf höchstens ${LAENGE.menueName} Zeichen haben.`, felder };
  }
  if (felder.benutzername.length < 2 || felder.benutzername.length > 40) {
    return { error: "Bitte einen Benutzernamen mit 2 bis 40 Zeichen wählen.", felder };
  }
  if (passwort.length < PASSWORT_MINDESTLAENGE) {
    return { error: `Das Passwort braucht mindestens ${PASSWORT_MINDESTLAENGE} Zeichen.`, felder };
  }
  if (passwort !== passwortWiederholung) {
    return { error: "Die beiden Passwörter stimmen nicht überein.", felder };
  }
  // Tester dürfen keinen gleichen Namen haben (siehe testzugang-actions.ts).
  if (await basisPrisma.testzugang.findUnique({ where: { nameKlein: felder.benutzername.toLowerCase() } })) {
    return { error: "Dieser Benutzername ist schon vergeben.", felder };
  }

  if (!(await hauptzugangAnlegen(felder.benutzername, passwort))) {
    redirect("/login");
  }

  const daten = {
    halterName: felder.halterName,
    menueName: felder.menueName || null,
    bundesland: istBundesland(felder.bundesland) ? felder.bundesland : null,
  };
  await basisPrisma.betrieb.upsert({
    where: { id: "standard" },
    create: { id: "standard", ...daten, kalenderToken: randomUUID() },
    update: daten,
  });

  // Ohne Versionsnummer gibt es den Schalter nicht, dann bleibt die Vorgabe.
  if (pruefungMoeglich()) {
    await basisPrisma.updateStand.upsert({
      where: { id: "standard" },
      create: { id: "standard", pruefungAn: felder.updatePruefung },
      update: { pruefungAn: felder.updatePruefung },
    });
  }

  await sitzungSetzen(ADMIN_KONTO);
  redirect("/");
}
