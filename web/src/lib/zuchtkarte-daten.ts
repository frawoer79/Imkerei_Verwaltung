import { prisma } from "@/lib/prisma";
import {
  BEGATTUNGSART_LABEL,
  HERKUNFT_LABEL,
  anzeigeFarbe,
  belegjahr,
  koeniginZeile,
  kurzesDatum,
  type Begattungsart,
  type Herkunft,
} from "@/lib/koeniginnen";
import { leistungKurz, leistungLaden } from "@/lib/koenigin-leistung";
import {
  inhaltBereinigen,
  kartenText,
  leererInhalt,
  type ZuchtkarteInhalt,
} from "@/lib/zuchtkarte-inhalt";

// Laden und Vorbelegen von Zuchtkarten. Nur serverseitig (Prisma-Import);
// die reine Beschreibung der Felder steht in lib/zuchtkarte-inhalt.ts.

/// Datum für den Fuß der Karte: "Stand 03.10.2026". Immer nach deutscher
/// Zeit, sonst steht kurz nach Mitternacht noch der Vortag auf der Karte.
export function standAnzeige(datum: Date): string {
  return datum.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function begattungsZeitraum(von: Date | null, bis: Date | null): string {
  if (von && bis) return `${kurzesDatum(von)} - ${kurzesDatum(bis)}`;
  return kurzesDatum(von ?? bis);
}

/// Alles, was die Zuchtkarte aus den Daten der Königin ableitet - also das,
/// womit eine neu erstellte Karte vorbelegt wird. Gibt `null` zurück, wenn es
/// die Königin nicht gibt.
export async function zuchtkarteVorschlagLaden(
  koeniginId: string
): Promise<{ kennung: string; inhalt: ZuchtkarteInhalt } | null> {
  const koenigin = await prisma.koenigin.findUnique({
    where: { id: koeniginId },
    include: {
      belegstelle: { select: { name: true } },
      begattungsStand: { select: { name: true } },
      herkunftsVolk: { select: { name: true } },
      volk: { select: { id: true } },
      ereignisse: { select: { art: true, datum: true, volkId: true } },
      mutterKoenigin: {
        include: {
          belegstelle: { select: { name: true } },
          begattungsStand: { select: { name: true } },
        },
      },
    },
  });
  if (!koenigin) return null;

  const [betrieb, leistung] = await Promise.all([
    prisma.betrieb.findUnique({ where: { id: "standard" } }),
    leistungLaden(koenigin),
  ]);
  const mutter = koenigin.mutterKoenigin;
  // Bei Belegstellenbegattung die Drohnenvölker aus dem Belegjahr.
  const jahr = koenigin.begattungsart === "BELEGSTELLE" ? belegjahr(koenigin) : null;
  const drohnenvoelker =
    koenigin.belegstelleId && jahr !== null
      ? ((
          await prisma.belegstelleJahr.findUnique({
            where: { belegstelleId_jahr: { belegstelleId: koenigin.belegstelleId, jahr } },
          })
        )?.drohnenvoelker ?? null)
      : null;
  const farbe = anzeigeFarbe(koenigin.jahrgang, koenigin.zeichenFarbe);
  const ort =
    koenigin.begattungsart === "BELEGSTELLE"
      ? koenigin.belegstelle?.name
      : koenigin.begattungsart === "STANDBEGATTUNG"
        ? koenigin.begattungsStand?.name
        : null;
  const hatBeurteilung = leistung !== null && leistung.kriterien.length > 0;

  const inhalt: ZuchtkarteInhalt = {
    ...leererInhalt(),
    kopfzeile: [betrieb?.halterName, betrieb?.plzOrt].filter(Boolean).join(" - ") || "Imkerei",
    jahrgang: koenigin.jahrgang ? String(koenigin.jahrgang) : "",
    kennung: koenigin.kennung,
    untertitel: [koenigin.rasse, koenigin.jahrgang && `Jahrgang ${koenigin.jahrgang}`]
      .filter(Boolean)
      .join(" - "),
    herkunftArt: HERKUNFT_LABEL[koenigin.herkunft as Herkunft] ?? "",
    herkunftVolk: koenigin.herkunftsVolk?.name ?? "",
    geschluepft: kurzesDatum(koenigin.schlupfDatum),
    herkunftBemerkung: koenigin.herkunftText ?? "",
    // `koeniginZeile` enthält Rasse und Jahrgang schon mit - nicht doppelt.
    mutterName: mutter?.kennung ?? "unbekannt",
    mutterDetail: mutter ? koeniginZeile(mutter) : "",
    vaterseite: koenigin.vaterlinie ?? drohnenvoelker ?? "",
    begattungArt: BEGATTUNGSART_LABEL[koenigin.begattungsart as Begattungsart] ?? "",
    begattungOrt: ort ?? "",
    begattungZeitraum: begattungsZeitraum(koenigin.begattungVon, koenigin.begattungBis),
    zeichen: [koenigin.zeichenFarbe ?? farbe?.name, koenigin.zeichenNummer && `Nr. ${koenigin.zeichenNummer}`]
      .filter(Boolean)
      .join(", "),
    zuchtbuch: koenigin.zuchtbuchnummer ?? "",
    // Aus Durchsichten, die beim Speichern der Stockkarte als Bewertung
    // bestätigt wurden - leer, solange es dazu noch keine gibt.
    beurteilung: hatBeurteilung ? leistungKurz(leistung).join(" - ") : "",
    beurteilungKontext: hatBeurteilung
      ? [
          leistung.honigSummeKg > 0 && `Honig ${leistung.honigSummeKg.toFixed(1).replace(".", ",")} kg`,
          `aus ${leistung.anzahlBewertungen} ${leistung.anzahlBewertungen === 1 ? "Bewertung" : "Bewertungen"}`,
        ]
          .filter(Boolean)
          .join(", ")
      : "",
    // Vorbelegung aus der Zeit, als die Bemerkung noch an der Königin hing.
    bemerkung: koenigin.zuchtkarteBemerkung ?? "",
    fussName: betrieb?.halterName ?? "",
    fussRegNr: betrieb?.registriernummer ?? "",
  };

  // Durch denselben Filter wie jede Eingabe schicken, damit auch eine
  // vorbelegte Karte nur Zeichen enthält, die das PDF darstellen kann, und
  // kein Feld über seine Höchstlänge hinausgeht.
  for (const feld of Object.keys(inhalt) as (keyof ZuchtkarteInhalt)[]) {
    inhalt[feld] = kartenText(inhalt[feld], feld).trim();
  }
  return { kennung: koenigin.kennung, inhalt };
}

/// Die erstellte Karte einer Königin - `null`, solange keine erstellt wurde.
export async function zuchtkarteLaden(koeniginId: string) {
  const karte = await prisma.zuchtkarte.findUnique({ where: { koeniginId } });
  if (!karte) return null;
  return {
    inhalt: inhaltBereinigen(karte.inhalt),
    stand: standAnzeige(karte.updatedAt),
    geaendertAm: karte.updatedAt,
  };
}
