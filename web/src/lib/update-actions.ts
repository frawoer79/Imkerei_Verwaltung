"use server";

import { revalidatePath } from "next/cache";
import { basisPrisma } from "@/lib/datenbank";
import { istAdmin } from "@/lib/konto";
import { knopfMoeglich, updateAnfordern, updateStatusLesen } from "@/lib/update-steuerung";
import { istSicherheitsupdate, neuereVersionen, SPAETER_MS, updatePruefen, updateStandLaden } from "@/lib/update";

// Knöpfe am Update-Band und unter Einstellungen -> System. Nur der
// Hauptzugang, jede Aktion prüft das selbst.

async function nurAdmin() {
  if (!(await istAdmin())) throw new Error("Nur der Hauptzugang darf das.");
}

async function speichern(daten: {
  pruefungAn?: boolean;
  spaeterBis?: Date | null;
  uebersprungen?: string | null;
}) {
  await basisPrisma.updateStand.upsert({
    where: { id: "standard" },
    create: { id: "standard", ...daten },
    update: daten,
  });
  revalidatePath("/", "layout");
}

// Band für 7 Tage ausblenden, bei einem Sicherheitsupdate nur bis morgen.
export async function updateSpaeter() {
  await nurAdmin();
  const sicherheit = neuereVersionen(await updateStandLaden()).some(istSicherheitsupdate);
  await speichern({ spaeterBis: new Date(Date.now() + (sicherheit ? SPAETER_MS / 7 : SPAETER_MS)) });
}

export async function updateUeberspringen(formData: FormData) {
  await nurAdmin();
  const version = formData.get("version")?.toString() ?? "";
  if (!/^\d+\.\d+\.\d+$/.test(version)) return;
  await speichern({ uebersprungen: version, spaeterBis: null });
}

export async function updatePruefungSchalten(an: boolean) {
  await nurAdmin();
  await speichern({ pruefungAn: an });
  if (an) await updatePruefen();
}

export async function updateJetztPruefen() {
  await nurAdmin();
  await updatePruefen();
  revalidatePath("/", "layout");
}

// Knopf "Update einspielen": nur um das Update bitten, ausführen tut es der
// Dienst auf dem Server (siehe lib/update-steuerung.ts).
export async function updateEinspielen(): Promise<{ fehler: string | null }> {
  await nurAdmin();
  if (!(await knopfMoeglich())) {
    return { fehler: "Der Knopf geht hier nicht. Bitte am Server eingeben: sudo imkerei-update" };
  }
  if ((await updateStatusLesen())?.zustand === "laeuft") {
    return { fehler: "Es läuft schon ein Update." };
  }
  await updateAnfordern();
  return { fehler: null };
}
