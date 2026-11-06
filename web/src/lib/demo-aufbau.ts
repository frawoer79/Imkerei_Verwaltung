import { basisPrisma } from "@/lib/datenbank";
import { beispieldatenAnlegen } from "@/lib/beispieldaten";
import { anzahlPlaetze, istDemoPlatz, NUR_PLAETZE, PRAEFIX, platzAbgelaufen, platzFreigeben, platzId } from "@/lib/demo";
import { testerSchema } from "@/lib/konto";
import { testerDatenAnlegen, testerDatenLoeschen } from "@/lib/testzugang";

// Hintergrundarbeit der Demo (siehe lib/demo.ts): Plätze anlegen, abgelaufene
// freigeben und neu mit Fantasiedaten füllen. Läuft aus instrumentation.ts.
// Getrennt von lib/demo.ts, weil proxy.ts jene Datei lädt und hier Schweres
// hängt (Migrationen, Beispieldaten).

// Beim Start: fehlende Plätze anlegen, überzählige entfernen und alle neu
// aufbauen lassen. Nach einem Update haben so alle Plätze frische Daten im
// neuesten Stand.
export async function plaetzeVorbereiten(): Promise<void> {
  const anzahl = anzahlPlaetze();
  const vorhanden = await basisPrisma.testzugang.findMany({ where: NUR_PLAETZE, select: { id: true } });
  for (const { id } of vorhanden) {
    const nummer = Number(id.slice(PRAEFIX.length));
    if (!istDemoPlatz(id) || nummer < 1 || nummer > anzahl) {
      await testerDatenLoeschen(id);
      await basisPrisma.testzugang.delete({ where: { id } });
    }
  }
  for (let nummer = 1; nummer <= anzahl; nummer++) {
    const id = platzId(nummer);
    await basisPrisma.testzugang.upsert({
      where: { id },
      create: {
        id,
        einladungToken: `demo-platz-${nummer}`,
        name: "Demo",
        nameKlein: `demo-platz-${nummer}`,
        notiz: "aufbau",
      },
      update: { notiz: "aufbau", eingerichtetAm: null, sitzungenGueltigAb: new Date() },
    });
  }
}

// Abgelaufene Plätze freigeben.
export async function aufraeumen(): Promise<void> {
  const belegt = await basisPrisma.testzugang.findMany({
    where: { ...NUR_PLAETZE, eingerichtetAm: { not: null } },
    select: { id: true, eingerichtetAm: true, letzteAnmeldung: true },
  });
  for (const platz of belegt) {
    if (platzAbgelaufen(platz)) await platzFreigeben(platz.id);
  }
}

const zustand = globalThis as unknown as { demoAufbauLaeuft?: boolean };

// Baut alle freigegebenen Plätze neu auf, einen nach dem anderen. Läuft schon
// ein Aufbau, passiert nichts.
export async function aufbauen(): Promise<void> {
  if (zustand.demoAufbauLaeuft) return;
  zustand.demoAufbauLaeuft = true;
  try {
    for (;;) {
      const platz = await basisPrisma.testzugang.findFirst({
        where: { ...NUR_PLAETZE, notiz: "aufbau", eingerichtetAm: null },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      if (!platz) return;
      const beginn = Date.now();
      await testerDatenLoeschen(platz.id);
      await testerDatenAnlegen(platz.id);
      await beispieldatenAnlegen(testerSchema(platz.id), new Date(), { demo: true });
      // Nur auf "bereit", wenn er nicht in der Zwischenzeit entfernt wurde.
      await basisPrisma.testzugang.updateMany({
        where: { id: platz.id, notiz: "aufbau", eingerichtetAm: null },
        data: { notiz: "bereit" },
      });
      console.log(`Demo: Platz ${platz.id} neu aufgebaut (${Math.round((Date.now() - beginn) / 1000)} s).`);
    }
  } catch (fehler) {
    // Beim nächsten Takt erneut versuchen.
    console.error("Demo: Aufbau fehlgeschlagen:", fehler);
  } finally {
    zustand.demoAufbauLaeuft = false;
  }
}

export async function demoTakt(): Promise<void> {
  try {
    await aufraeumen();
  } catch (fehler) {
    console.error("Demo: Aufräumen fehlgeschlagen:", fehler);
  }
  await aufbauen();
}
