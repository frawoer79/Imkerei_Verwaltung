// Lagerverwaltung: Material (Zargen + frei benanntes Zubehör) und
// Erzeugnisse (Honig, Wachs, ...).
//
// Eine Zarge kennt seit der Zusammenführung von Brutraum und Honigraum kein
// "verwendung"-Feld mehr - "im Einsatz" zählt beides gleichzeitig zusammen:
// aktive Honigraumaufsätze (noch nicht geerntet) UND aktive Völker, die
// diese Zarge als Brutraum führen (mit deren jeweiliger Zargenzahl). Setzt
// Frank einen Honigraum in der Stockkarte auf oder weist er einem Volk eine
// Brutraum-Zarge zu, sinkt der verfügbare Bestand dadurch automatisch, ohne
// einen zweiten Zähler pflegen zu müssen, der aus dem Takt geraten könnte.
//
// Bei Erzeugnissen kann eine Buchung optional ein Gebinde (Eimer, Glas, ...)
// mit fester Füllmenge und/oder eine Sorte (z.B. Waldhonig) aus dem Katalog
// tragen - `anzahl` ist dann die Stückzahl, mit demselben Vorzeichen wie
// `menge` (negativ bei einem Abgang), damit sich sowohl der Kilogramm- als
// auch der Stückbestand einer Gruppe einfach durch Aufsummieren ergeben.
// Lagerort ist rein informativ, keins von beidem ist Pflicht.

import { prisma } from "@/lib/prisma";
import { runden } from "@/lib/honig";

export type ZargeBestand = {
  id: string;
  systemName: string;
  name: string;
  wabenAnzahl: number;
  gesamtbestand: number | null;
  imEinsatz: number;
  /// null, solange kein Gesamtbestand erfasst ist.
  verfuegbar: number | null;
};

export async function zargenBestandsuebersicht(): Promise<ZargeBestand[]> {
  const [zargen, brutraumSummen] = await Promise.all([
    prisma.zarge.findMany({
      orderBy: [{ wabenmass: { beutensystem: { name: "asc" } } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        wabenAnzahl: true,
        gesamtbestand: true,
        wabenmass: { select: { beutensystem: { select: { name: true } } } },
        _count: { select: { honigraumaufsaetze: { where: { geerntetAm: null } } } },
      },
    }),
    // Eine Abfrage für alle Zargen statt einer je Zarge: wie viele Zargen
    // aktive Völker insgesamt als Brutraum je Zargen-Typ gerade belegen.
    prisma.volk.groupBy({
      by: ["brutraumZargeId"],
      where: { archiviert: false, brutraumZargeId: { not: null } },
      _sum: { brutraumZargenAnzahl: true },
    }),
  ]);

  const brutraumJeZarge = new Map(
    brutraumSummen.map((eintrag) => [eintrag.brutraumZargeId as string, eintrag._sum.brutraumZargenAnzahl ?? 0])
  );

  return zargen.map((zarge) => {
    const imEinsatz = zarge._count.honigraumaufsaetze + (brutraumJeZarge.get(zarge.id) ?? 0);

    return {
      id: zarge.id,
      systemName: zarge.wabenmass.beutensystem.name,
      name: zarge.name,
      wabenAnzahl: zarge.wabenAnzahl,
      gesamtbestand: zarge.gesamtbestand,
      imEinsatz,
      verfuegbar: zarge.gesamtbestand === null ? null : zarge.gesamtbestand - imEinsatz,
    };
  });
}

/// Klimadeckel: Materialartikel mit `klimadeckel = true`. `bestand` ist der
/// Gesamtbestand, "im Einsatz" zählt aktive Völker, denen dieser Deckel
/// zugeordnet ist - gleiches Prinzip wie bei den Zargen. Standarddeckel
/// werden bewusst nicht erfasst.
export type KlimadeckelBestand = {
  id: string;
  name: string;
  einheit: string;
  gesamtbestand: number;
  imEinsatz: number;
  verfuegbar: number;
  notizen: string | null;
  lagerortId: string | null;
  lagerort: { name: string } | null;
};

export async function klimadeckelBestandsuebersicht(): Promise<KlimadeckelBestand[]> {
  const deckel = await prisma.materialartikel.findMany({
    where: { klimadeckel: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      einheit: true,
      bestand: true,
      notizen: true,
      lagerortId: true,
      lagerort: { select: { name: true } },
      _count: { select: { voelker: { where: { archiviert: false } } } },
    },
  });

  return deckel.map(({ bestand, _count, ...rest }) => ({
    ...rest,
    gesamtbestand: bestand,
    imEinsatz: _count.voelker,
    verfuegbar: bestand - _count.voelker,
  }));
}

/// Auswahl am Volk: "Standarddeckel" (leer) oder einer dieser Klimadeckel.
export type KlimadeckelAuswahl = { id: string; name: string };

export async function klimadeckelAuswahlListe(): Promise<KlimadeckelAuswahl[]> {
  return prisma.materialartikel.findMany({
    where: { klimadeckel: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/// Ort, an dem etwas lagert - komplett optional, siehe Prisma-Schema.
export type LagerortAnzeige = { id: string; name: string };

export async function lagerorteListe(): Promise<LagerortAnzeige[]> {
  return prisma.lagerort.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export type GebindeAnzeige = {
  id: string;
  name: string;
  inhalt: number;
  /// Euro je Stück, nur für den Warenwert (siehe lib/warenwert.ts).
  preis: number | null;
};

/// Warenwert im Lager eingeschaltet? Ohne gespeicherte Einstellung: aus.
export async function warenwertAn(): Promise<boolean> {
  const einstellung = await prisma.lagereinstellung.findUnique({ where: { id: "standard" }, select: { warenwert: true } });
  return einstellung?.warenwert ?? false;
}

export type SorteAnzeige = {
  id: string;
  name: string;
  /// Warenwert: Preis je Einheit der Sorte und je Stück eines Gebindes.
  preis: number | null;
  gebindePreise: { gebindeId: string; preis: number }[];
};

export type ErzeugnisBuchungAnzeige = {
  id: string;
  menge: number;
  datum: Date;
  grund: string | null;
  notizen: string | null;
  sorteId: string | null;
  sorteName: string | null;
  zustand: string | null;
  gebindeId: string | null;
  gebindeName: string | null;
  anzahl: number | null;
  eimerId: string | null;
  eimerNummer: number | null;
  lagerortId: string | null;
  lagerortName: string | null;
  volkName: string | null;
  volkId: string | null;
  bienenstandId: string | null;
};

/// Ein Posten im Lager: Bestand gleicher Sorte, Zustand, Gebinde und
/// Lagerort - z.B. "Waldhonig · Eimer 25 kg · Lager 1: 10 Stück (250,0 kg)".
/// Buchungen ganz ohne diese Angaben bilden einen Posten "lose Menge".
/// Auslagern und Abfüllen gehen immer von so einem Posten aus.
export type ErzeugnisBestandGruppe = {
  sorteId: string | null;
  sorteName: string | null;
  zustand: string | null;
  gebindeId: string | null;
  gebindeName: string | null;
  gebindeInhalt: number | null;
  lagerortId: string | null;
  lagerortName: string | null;
  /// Nur gesetzt, wenn die Gruppe ein Gebinde hat - Summe der (signierten)
  /// Stückzahl aller Buchungen dieser Gruppe.
  anzahl: number | null;
  menge: number;
  /// Einzeln geführte Eimer dieses Postens, die noch etwas enthalten
  /// (nach Nummer), und wie viele Eimer ohne Einzelgewicht dazu zählen.
  eimer: EimerAnzeige[];
  ohneEinzelgewicht: number;
};

export type EimerAnzeige = {
  id: string;
  nummer: number;
  /// Was jetzt drin ist (Summe der Buchungen).
  gewicht: number;
  /// Was beim Einlagern drin war.
  eingelagert: number;
  eingelagertAm: Date;
};

export type ErzeugnisBestand = {
  id: string;
  name: string;
  einheit: string;
  vorgegeben: boolean;
  eimerEinzeln: boolean;
  /// Euro je Einheit, nur für den Warenwert (siehe lib/warenwert.ts).
  preis: number | null;
  bestand: number;
  gebinde: GebindeAnzeige[];
  sorten: SorteAnzeige[];
  buchungen: ErzeugnisBuchungAnzeige[];
  /// Posten mit Bestand (oder - aus älteren Buchungen - mit negativem
  /// Bestand, damit der sichtbar bleibt und sich korrigieren lässt).
  posten: ErzeugnisBestandGruppe[];
};

function gruppenSchluessel(buchung: {
  sorteId: string | null;
  zustand: string | null;
  gebindeId: string | null;
  lagerortId: string | null;
}): string {
  return `${buchung.sorteId ?? ""}|${buchung.zustand ?? ""}|${buchung.gebindeId ?? ""}|${buchung.lagerortId ?? ""}`;
}

export async function erzeugnisBestandUebersicht(): Promise<ErzeugnisBestand[]> {
  const typen = await prisma.erzeugnistyp.findMany({
    orderBy: [{ reihenfolge: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      einheit: true,
      vorgegeben: true,
      eimerEinzeln: true,
      preis: true,
      gebinde: { orderBy: { inhalt: "desc" }, select: { id: true, name: true, inhalt: true, preis: true } },
      sorten: {
        orderBy: [{ reihenfolge: "asc" }, { name: "asc" }],
        select: { id: true, name: true, preis: true, gebindePreise: { select: { gebindeId: true, preis: true } } },
      },
      buchungen: {
        orderBy: { datum: "desc" },
        select: {
          id: true,
          menge: true,
          datum: true,
          grund: true,
          notizen: true,
          sorteId: true,
          sorte: { select: { name: true } },
          zustand: true,
          anzahl: true,
          gebindeId: true,
          gebinde: { select: { name: true, inhalt: true } },
          eimerId: true,
          eimer: { select: { nummer: true } },
          lagerortId: true,
          lagerort: { select: { name: true } },
          volkId: true,
          volk: { select: { name: true, bienenstandId: true } },
        },
      },
    },
  });

  return typen.map((typ) => {
    const buchungen: ErzeugnisBuchungAnzeige[] = typ.buchungen.map((buchung) => ({
      id: buchung.id,
      menge: buchung.menge,
      datum: buchung.datum,
      grund: buchung.grund,
      notizen: buchung.notizen,
      sorteId: buchung.sorteId,
      sorteName: buchung.sorte?.name ?? null,
      zustand: buchung.zustand,
      gebindeId: buchung.gebindeId,
      gebindeName: buchung.gebinde?.name ?? null,
      anzahl: buchung.anzahl,
      eimerId: buchung.eimerId,
      eimerNummer: buchung.eimer?.nummer ?? null,
      lagerortId: buchung.lagerortId,
      lagerortName: buchung.lagerort?.name ?? null,
      volkId: buchung.volkId,
      volkName: buchung.volk?.name ?? null,
      bienenstandId: buchung.volk?.bienenstandId ?? null,
    }));

    const gebindeInhalt = new Map(typ.buchungen.map((buchung) => [buchung.gebindeId, buchung.gebinde?.inhalt ?? null]));
    const gruppenKarte = new Map<string, ErzeugnisBestandGruppe>();
    const eimerJeGruppe = new Map<string, Map<string, EimerAnzeige>>();
    for (const buchung of buchungen) {
      const schluessel = gruppenSchluessel(buchung);
      if (buchung.eimerId && buchung.eimerNummer !== null) {
        const eimerKarte = eimerJeGruppe.get(schluessel) ?? new Map<string, EimerAnzeige>();
        eimerJeGruppe.set(schluessel, eimerKarte);
        const eimer = eimerKarte.get(buchung.eimerId) ?? {
          id: buchung.eimerId,
          nummer: buchung.eimerNummer,
          gewicht: 0,
          eingelagert: 0,
          eingelagertAm: buchung.datum,
        };
        eimer.gewicht += buchung.menge;
        if (buchung.menge > 0) {
          eimer.eingelagert += buchung.menge;
          // Buchungen kommen neueste zuerst - der Zugang ist der älteste.
          eimer.eingelagertAm = buchung.datum;
        }
        eimerKarte.set(buchung.eimerId, eimer);
      }
      const vorhanden = gruppenKarte.get(schluessel);
      if (vorhanden) {
        vorhanden.menge += buchung.menge;
        if (buchung.gebindeId) vorhanden.anzahl = (vorhanden.anzahl ?? 0) + (buchung.anzahl ?? 0);
      } else {
        gruppenKarte.set(schluessel, {
          sorteId: buchung.sorteId,
          sorteName: buchung.sorteName,
          zustand: buchung.zustand,
          gebindeId: buchung.gebindeId,
          gebindeName: buchung.gebindeName,
          gebindeInhalt: gebindeInhalt.get(buchung.gebindeId) ?? null,
          lagerortId: buchung.lagerortId,
          lagerortName: buchung.lagerortName,
          anzahl: buchung.gebindeId ? (buchung.anzahl ?? 0) : null,
          menge: buchung.menge,
          eimer: [],
          ohneEinzelgewicht: 0,
        });
      }
    }
    // Leere Posten (alles ausgelagert) fallen weg. Reihenfolge: Sorte, dann
    // große Gebinde vor kleinen, lose Menge zuletzt, dann Lagerort.
    const posten = [...gruppenKarte.entries()]
      .map(([schluessel, gruppe]) => {
        const eimer = [...(eimerJeGruppe.get(schluessel)?.values() ?? [])]
          .map((eintrag) => ({
            ...eintrag,
            gewicht: Math.round(eintrag.gewicht * 1000) / 1000,
            eingelagert: Math.round(eintrag.eingelagert * 1000) / 1000,
          }))
          .filter((eintrag) => eintrag.gewicht >= 0.0005)
          .sort((a, b) => a.nummer - b.nummer);
        return {
          ...gruppe,
          menge: Math.round(gruppe.menge * 1000) / 1000,
          eimer,
          ohneEinzelgewicht: gruppe.gebindeId ? Math.max((gruppe.anzahl ?? 0) - eimer.length, 0) : 0,
        };
      })
      .filter((gruppe) => (gruppe.gebindeId ? gruppe.anzahl !== 0 : Math.abs(gruppe.menge) >= 0.0005))
      .sort(
        (a, b) =>
          (a.sorteName ?? "\uffff").localeCompare(b.sorteName ?? "\uffff") ||
          (a.zustand ?? "").localeCompare(b.zustand ?? "") ||
          (b.gebindeInhalt ?? -1) - (a.gebindeInhalt ?? -1) ||
          (a.lagerortName ?? "").localeCompare(b.lagerortName ?? "")
      );

    return {
      id: typ.id,
      name: typ.name,
      einheit: typ.einheit,
      vorgegeben: typ.vorgegeben,
      eimerEinzeln: typ.eimerEinzeln,
      preis: typ.preis,
      bestand: runden(buchungen.reduce((summe, buchung) => summe + buchung.menge, 0)),
      gebinde: typ.gebinde,
      sorten: typ.sorten,
      buchungen,
      posten,
    };
  });
}
