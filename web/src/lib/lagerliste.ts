import { prisma } from "@/lib/prisma";
import { zargenBestandsuebersicht, erzeugnisBestandUebersicht, warenwertAn } from "@/lib/lager";
import { postenWert, preisText } from "@/lib/warenwert";
import { sorteMitZustand } from "@/lib/honig-zustand";
import { brutraumBezeichnung, runden, zargeBezeichnung } from "@/lib/honig";

// Sammelt alles, was in einer Lagerliste (PDF) steht: Gesamtbestand, wo was
// lagert und was gerade im Einsatz ist - getrennt für Material und
// Erzeugnisse. Rechnet mit denselben Funktionen wie die Lager-Seite
// (lib/lager.ts), damit PDF und Bildschirm dieselben Zahlen zeigen.

export type LagerlisteArtWert = "MATERIAL" | "ERZEUGNISSE" | "BUCHUNGEN";

export const LAGERLISTE_TITEL: Record<LagerlisteArtWert, string> = {
  MATERIAL: "Lagerliste Material",
  ERZEUGNISSE: "Lagerliste Erzeugnisse",
  BUCHUNGEN: "Buchungen Erzeugnisse",
};

const OHNE_LAGERORT = "ohne Lagerort";

// Aktive Völker mit allem, was sie gerade an Zargen belegen - Grundlage für
// "im Einsatz" in beiden Listen (Zargen am Volk bzw. Honig noch im Honigraum).
async function voelkerImEinsatz() {
  const voelker = await prisma.volk.findMany({
    where: { archiviert: false },
    orderBy: [{ bienenstand: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      bienenstand: { select: { name: true } },
      brutraumZargenAnzahl: true,
      klimadeckel: { select: { name: true } },
      brutraumZarge: {
        select: { name: true, wabenmass: { select: { beutensystem: { select: { name: true } } } } },
      },
      honigraumaufsaetze: {
        where: { geerntetAm: null },
        orderBy: { aufgesetztAm: "asc" },
        select: { bezeichnung: true, honigProZargeKg: true, aufgesetztAm: true },
      },
    },
  });

  return voelker.map((volk) => ({
    id: volk.id,
    standName: volk.bienenstand.name,
    volkName: volk.name,
    brutraum: volk.brutraumZarge
      ? brutraumBezeichnung({
          systemName: volk.brutraumZarge.wabenmass.beutensystem.name,
          name: volk.brutraumZarge.name,
          zargenAnzahl: volk.brutraumZargenAnzahl,
        })
      : null,
    klimadeckel: volk.klimadeckel?.name ?? null,
    honigraeume: volk.honigraumaufsaetze,
  }));
}

/// Gleiche Bezeichnungen zusammenfassen: ["Flach", "Flach", "Hoch"] wird zu
/// "2 × Flach, Hoch".
function zusammenfassen(bezeichnungen: string[]): string {
  const zaehler = new Map<string, number>();
  for (const bezeichnung of bezeichnungen) zaehler.set(bezeichnung, (zaehler.get(bezeichnung) ?? 0) + 1);
  return [...zaehler.entries()].map(([text, anzahl]) => (anzahl > 1 ? `${anzahl} × ${text}` : text)).join(", ");
}

export async function materialListeLaden() {
  const [betrieb, zargenAlle, artikel, voelker] = await Promise.all([
    prisma.betrieb.findUnique({ where: { id: "standard" }, select: { halterName: true } }),
    zargenBestandsuebersicht(),
    prisma.materialartikel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, einheit: true, bestand: true, notizen: true, lagerort: { select: { name: true } } },
    }),
    voelkerImEinsatz(),
  ]);

  // Der Zargen-Katalog bringt viele Größen mit, die Frank nie benutzt - in der
  // Liste stehen nur die, für die ein Bestand erfasst ist oder die gerade an
  // einem Volk stecken.
  const zargen = zargenAlle
    .filter((zarge) => zarge.gesamtbestand !== null || zarge.imEinsatz > 0)
    .map((zarge) => ({ ...zarge, bezeichnung: zargeBezeichnung(zarge) }));

  // Zubehör nach Lagerort, "ohne Lagerort" am Ende.
  const orte = new Map<string, typeof artikel>();
  for (const eintrag of artikel) {
    const ort = eintrag.lagerort?.name ?? OHNE_LAGERORT;
    orte.set(ort, [...(orte.get(ort) ?? []), eintrag]);
  }
  const zubehoerNachOrt = [...orte.entries()]
    .sort(([a], [b]) => (a === OHNE_LAGERORT ? 1 : b === OHNE_LAGERORT ? -1 : a.localeCompare(b, "de")))
    .map(([ort, eintraege]) => ({ ort, artikel: eintraege }));

  const imEinsatz = voelker
    .filter((volk) => volk.brutraum || volk.klimadeckel || volk.honigraeume.length > 0)
    .map((volk) => ({
      ...volk,
      honigraumText: zusammenfassen(volk.honigraeume.map((aufsatz) => aufsatz.bezeichnung)),
    }));

  return {
    betrieb,
    zargen,
    zubehoerNachOrt,
    anzahlArtikel: artikel.length,
    imEinsatz,
    anzahlPositionen: zargen.length + artikel.length,
  };
}

export type MaterialListe = Awaited<ReturnType<typeof materialListeLaden>>;

export async function erzeugnisListeLaden() {
  const [betrieb, typen, voelker, warenwert] = await Promise.all([
    prisma.betrieb.findUnique({ where: { id: "standard" }, select: { halterName: true } }),
    erzeugnisBestandUebersicht(),
    voelkerImEinsatz(),
    warenwertAn(),
  ]);

  const erzeugnisse = typen.map((typ) => {
    // Anders als auf der Lager-Seite auch die Buchungen ohne jede Angabe als
    // eigene Zeile, damit die Zeilen sich zum Gesamtbestand aufsummieren.
    const gruppen = new Map<
      string,
      {
        schluessel: string;
        lagerort: string;
        sorteId: string | null;
        sorte: string | null;
        gebindeId: string | null;
        gebinde: string | null;
        anzahl: number | null;
        menge: number;
      }
    >();
    for (const buchung of typ.buchungen) {
      const schluessel = `${buchung.lagerortId ?? ""}|${buchung.sorteId ?? ""}|${buchung.zustand ?? ""}|${buchung.gebindeId ?? ""}`;
      const gruppe = gruppen.get(schluessel) ?? {
        schluessel,
        lagerort: buchung.lagerortName ?? OHNE_LAGERORT,
        sorteId: buchung.sorteId,
        sorte: sorteMitZustand(buchung.sorteName, buchung.zustand),
        gebindeId: buchung.gebindeId,
        gebinde: buchung.gebindeName,
        anzahl: buchung.gebindeId ? 0 : null,
        menge: 0,
      };
      gruppe.menge += buchung.menge;
      if (buchung.gebindeId) gruppe.anzahl = (gruppe.anzahl ?? 0) + (buchung.anzahl ?? 0);
      gruppen.set(schluessel, gruppe);
    }

    // Bei "Eimer einzeln wiegen" stehen die Einzelgewichte unter dem Posten.
    const eimerJePosten = new Map(
      typ.posten.map((posten) => [
        `${posten.lagerortId ?? ""}|${posten.sorteId ?? ""}|${posten.zustand ?? ""}|${posten.gebindeId ?? ""}`,
        posten,
      ]),
    );
    const zeilen = [...gruppen.values()]
      .map(({ schluessel, ...gruppe }) => ({
        ...gruppe,
        menge: runden(gruppe.menge),
        // Warenwert nur, wenn eingeschaltet (Einstellungen -> Lager).
        wert: warenwert ? (postenWert(gruppe, typ)?.wert ?? null) : null,
        preis: warenwert ? preisText(typ, gruppe) : "",
        eimer: typ.eimerEinzeln ? (eimerJePosten.get(schluessel)?.eimer ?? []) : [],
        ohneEinzelgewicht: typ.eimerEinzeln ? (eimerJePosten.get(schluessel)?.ohneEinzelgewicht ?? 0) : 0,
      }))
      // Restlos verbrauchte Posten gehören nicht mehr in eine Bestandsliste.
      .filter((gruppe) => gruppe.menge !== 0 || (gruppe.anzahl ?? 0) !== 0)
      .sort(
        (a, b) =>
          (a.lagerort === OHNE_LAGERORT ? 1 : 0) - (b.lagerort === OHNE_LAGERORT ? 1 : 0) ||
          a.lagerort.localeCompare(b.lagerort, "de") ||
          (a.sorte ?? "").localeCompare(b.sorte ?? "", "de") ||
          (a.gebinde ?? "").localeCompare(b.gebinde ?? "", "de")
      );

    // Warenwert je Sorte (nur mit Warenwert und wenn Sorten gebucht sind).
    const sortenSumme = new Map<string, { sorte: string; menge: number; wert: number }>();
    if (warenwert && zeilen.some((zeile) => zeile.sorteId)) {
      for (const zeile of zeilen) {
        const name = typ.sorten.find((sorte) => sorte.id === zeile.sorteId)?.name ?? "Ohne Sorte";
        const summe = sortenSumme.get(name) ?? { sorte: name, menge: 0, wert: 0 };
        summe.menge = Math.round((summe.menge + zeile.menge) * 1000) / 1000;
        summe.wert = Math.round((summe.wert + (zeile.wert ?? 0)) * 100) / 100;
        sortenSumme.set(name, summe);
      }
    }

    return {
      id: typ.id,
      name: typ.name,
      einheit: typ.einheit,
      bestand: typ.bestand,
      nachSorte: [...sortenSumme.values()].sort(
        (a, b) => (a.sorte === "Ohne Sorte" ? 1 : 0) - (b.sorte === "Ohne Sorte" ? 1 : 0) || a.sorte.localeCompare(b.sorte, "de"),
      ),
      wert: warenwert ? Math.round(zeilen.reduce((summe, zeile) => summe + (zeile.wert ?? 0), 0) * 100) / 100 : null,
      zeilen,
    };
  });

  // Im Einsatz: Honig, der noch in aufgesetzten Honigräumen auf den Völkern
  // sitzt - geschätzt mit dem Durchschnittsertrag je Zarge beim Aufsetzen.
  const aufDenVoelkern = voelker
    .filter((volk) => volk.honigraeume.length > 0)
    .map((volk) => ({
      id: volk.id,
      standName: volk.standName,
      volkName: volk.volkName,
      honigraumText: zusammenfassen(volk.honigraeume.map((aufsatz) => aufsatz.bezeichnung)),
      geschaetztKg: runden(volk.honigraeume.reduce((summe, aufsatz) => summe + aufsatz.honigProZargeKg, 0)),
    }));

  return {
    betrieb,
    warenwert,
    erzeugnisse,
    aufDenVoelkern,
    aufDenVoelkernKg: runden(aufDenVoelkern.reduce((summe, volk) => summe + volk.geschaetztKg, 0)),
    anzahlPositionen: erzeugnisse.reduce((summe, erzeugnis) => summe + erzeugnis.zeilen.length, 0),
  };
}

export type ErzeugnisListe = Awaited<ReturnType<typeof erzeugnisListeLaden>>;

// --- Buchungen (Zu- und Abgänge) in einem Zeitraum ----------------------------

// Auf Gramm genau, ein Glas 125 g darf nicht zu 0,1 kg werden.
function aufGramm(menge: number): number {
  return Math.round(menge * 1000) / 1000;
}

// `von`/`bis` als Tage (Mitternacht wie beim Buchen gespeichert), `bis`
// einschließlich. `erzeugnistypId` leer = alle Erzeugnisse.
export async function buchungsListeLaden(von: Date, bis: Date, erzeugnistypId: string | null) {
  const bisExklusiv = new Date(bis.getTime() + 24 * 60 * 60 * 1000);
  const [betrieb, typen] = await Promise.all([
    prisma.betrieb.findUnique({ where: { id: "standard" }, select: { halterName: true } }),
    erzeugnisBestandUebersicht(),
  ]);

  const erzeugnisse = typen
    .filter((typ) => !erzeugnistypId || typ.id === erzeugnistypId)
    .map((typ) => {
      const anfang = aufGramm(
        typ.buchungen.filter((buchung) => buchung.datum < von).reduce((summe, buchung) => summe + buchung.menge, 0),
      );
      // Älteste zuerst, wie in einem Bestandsbuch.
      const buchungen = typ.buchungen
        .filter((buchung) => buchung.datum >= von && buchung.datum < bisExklusiv)
        .reverse()
        .map((buchung) => ({
          id: buchung.id,
          datum: buchung.datum,
          menge: buchung.menge,
          anzahl: buchung.anzahl,
          sorte: sorteMitZustand(buchung.sorteName, buchung.zustand),
          gebinde:
            buchung.eimerNummer !== null
              ? `${buchung.gebindeName ?? "Eimer"} Nr. ${buchung.eimerNummer}`
              : buchung.gebindeName,
          text: [
            buchung.grund,
            buchung.lagerortName,
            buchung.volkName ? `Volk ${buchung.volkName}` : null,
            buchung.notizen,
          ]
            .filter(Boolean)
            .join(" · "),
        }));
      const zugang = aufGramm(buchungen.filter((b) => b.menge > 0).reduce((summe, b) => summe + b.menge, 0));
      const abgang = aufGramm(buchungen.filter((b) => b.menge < 0).reduce((summe, b) => summe + b.menge, 0));
      return {
        id: typ.id,
        name: typ.name,
        einheit: typ.einheit,
        anfang,
        zugang,
        abgang,
        ende: aufGramm(anfang + zugang + abgang),
        buchungen,
      };
    })
    .filter((erzeugnis) => erzeugnis.buchungen.length > 0 || erzeugnis.anfang !== 0);

  return {
    betrieb,
    von,
    bis,
    nurErzeugnis: erzeugnistypId ? (typen.find((typ) => typ.id === erzeugnistypId)?.name ?? null) : null,
    erzeugnisse,
    anzahlPositionen: erzeugnisse.reduce((summe, erzeugnis) => summe + erzeugnis.buchungen.length, 0),
  };
}

export type BuchungsListe = Awaited<ReturnType<typeof buchungsListeLaden>>;
