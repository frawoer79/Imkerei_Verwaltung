import { prisma } from "@/lib/prisma";
import { KOENIGINS_BEURTEILUNGS_KRITERIEN, kriteriumAlsSchulnote } from "@/components/stockkarten-eintrag-felder";

// Leistungsdaten der Königin: Beurteilungskriterien (Sanftmut, Schwarmtrieb,
// Wabensitz, Gesamteindruck), Brutbild und Honigertrag hängen wesentlich an
// ihrer Genetik - sie gehören deshalb nicht nur ans Volk, sondern auch an sie.
//
// Zwei unterschiedliche Datengrundlagen, bewusst getrennt:
// - Die Beurteilungskriterien zählen nur aus Durchsichten, die beim
//   Speichern der Stockkarte ausdrücklich als Bewertung in den Lebenslauf
//   übernommen wurden (KoeniginEreignis mit art "BEWERTUNG") - so entscheidet
//   der Imker selbst, was in die Bewertung eingeht, statt dass automatisch
//   jede Durchsicht mitzählt.
// - Honigertrag und Brutwaben-Schnitt zählen dagegen weiterhin aus allen
//   Durchsichten im Zeitraum, in dem sie tatsächlich im jeweiligen Volk saß -
//   dafür gibt es keine vergleichbare Bestätigung beim Speichern.

/// Ereignisse, die einen Aufenthalt im Volk beenden.
const BEENDET_AUFENTHALT = ["ENTNOMMEN", "VERKAUFT", "VERSTORBEN", "GESCHWAERMT", "IN_ABLEGER"];

export type Aufenthalt = { volkId: string; von: Date; bis: Date | null };

type KoeniginFuerLeistung = {
  id: string;
  schlupfDatum: Date | null;
  createdAt: Date;
  volk: { id: string } | null;
  ereignisse: { art: string; datum: Date; volkId: string | null }[];
};

/// Wann saß sie in welchem Volk? Aus "zugesetzt" bis zum nächsten Ereignis,
/// das den Aufenthalt beendet.
export function aufenthalteErmitteln(koenigin: KoeniginFuerLeistung): {
  aufenthalte: Aufenthalt[];
  unscharf: boolean;
} {
  const sortiert = [...koenigin.ereignisse].sort((a, b) => a.datum.getTime() - b.datum.getTime());

  const aufenthalte: Aufenthalt[] = [];
  let offen: Aufenthalt | null = null;

  for (const ereignis of sortiert) {
    if (ereignis.art === "ZUGESETZT" && ereignis.volkId) {
      if (offen) {
        offen.bis = ereignis.datum;
        aufenthalte.push(offen);
      }
      offen = { volkId: ereignis.volkId, von: ereignis.datum, bis: null };
    } else if (BEENDET_AUFENTHALT.includes(ereignis.art) && offen) {
      offen.bis = ereignis.datum;
      aufenthalte.push(offen);
      offen = null;
    }
  }
  if (offen) aufenthalte.push(offen);

  // Ohne "zugesetzt"-Ereignis - etwa bei den Königinnen, die aus den früheren
  // Angaben am Volk entstanden sind - ist der Beginn nicht bekannt. Dann gilt
  // frühestens ihr Schlupf: vorher kann sie das Volk nicht geprägt haben.
  if (aufenthalte.length === 0 && koenigin.volk) {
    return {
      aufenthalte: [
        { volkId: koenigin.volk.id, von: koenigin.schlupfDatum ?? koenigin.createdAt, bis: null },
      ],
      unscharf: true,
    };
  }

  return { aufenthalte, unscharf: false };
}

export type Kriteriumswert = {
  feld: string;
  label: string;
  stufen: string[];
  schnitt: number;
  /// Schulnote (1 sehr gut - 6 ungenügend), aus dem Schnitt umgerechnet.
  schulnote: number;
  anzahl: number;
};

export type Leistung = {
  kriterien: Kriteriumswert[];
  /// Schnitt der Schulnoten aller Kriterien oben - einfaches Mittel, jedes
  /// Kriterium zählt gleich viel, unabhängig davon, wie viele Durchsichten
  /// jeweils dahinterstehen.
  gesamtnote: number | null;
  /// Anzahl der Durchsichten, die als Bewertung in den Lebenslauf
  /// übernommen wurden - Grundlage der Kriterien oben (nicht notwendig
  /// dieselbe Zahl wie bei einem einzelnen Kriterium, falls dort welche
  /// ausgeschlossen wurden).
  anzahlBewertungen: number;
  bebrueteteWabenSchnitt: number | null;
  brutwabenSchnitt: number | null;
  honigSummeKg: number;
  anzahlErnten: number;
};

function schnitt(werte: number[]): number | null {
  if (werte.length === 0) return null;
  return werte.reduce((summe, wert) => summe + wert, 0) / werte.length;
}

export async function leistungLaden(koenigin: KoeniginFuerLeistung): Promise<Leistung | null> {
  const { aufenthalte } = aufenthalteErmitteln(koenigin);
  if (aufenthalte.length === 0) return null;

  const [eintraege, bewertungen] = await Promise.all([
    prisma.stockkartenEintrag.findMany({
      where: {
        OR: aufenthalte.map((aufenthalt) => ({
          volkId: aufenthalt.volkId,
          datum: { gte: aufenthalt.von, ...(aufenthalt.bis ? { lte: aufenthalt.bis } : {}) },
        })),
      },
      select: { bebrueteteWaben: true, brutwaben: true, honigGeerntet: true, honigertragKg: true },
    }),
    prisma.koeniginEreignis.findMany({
      where: { koeniginId: koenigin.id, art: "BEWERTUNG", stockkartenEintragId: { not: null } },
      select: {
        stockkartenEintrag: {
          select: {
            volksstaerkeEinschaetzung: true,
            futtermengeEinschaetzung: true,
            sanftmut: true,
            schwarmtrieb: true,
            wabensitz: true,
            legeleistung: true,
            // gesamteindruck wird mitgeladen, damit der generische
            // Feldzugriff unten für jedes BeurteilungsFeld typsicher bleibt -
            // KOENIGINS_BEURTEILUNGS_KRITERIEN lässt es zur Laufzeit aber
            // links liegen, es zählt nicht zur Königin-Bewertung.
            gesamteindruck: true,
            ausschlussKriterien: true,
          },
        },
      },
    }),
  ]);

  const bewertungsEintraege = bewertungen
    .map((bewertung) => bewertung.stockkartenEintrag)
    .filter((eintrag): eintrag is NonNullable<typeof eintrag> => eintrag !== null);

  const kriterien = KOENIGINS_BEURTEILUNGS_KRITERIEN.flatMap((kriterium) => {
    const werte = bewertungsEintraege
      // Durchsichten, bei denen dieses eine Kriterium ausdrücklich aus der
      // Bewertung genommen wurde (z.B. wegen eines unvorhergesehenen
      // Ereignisses), zählen hier nicht mit - andere Kriterien derselben
      // Durchsicht bleiben davon unberührt.
      .filter((eintrag) => !eintrag.ausschlussKriterien.includes(kriterium.feld))
      .map((eintrag) => eintrag[kriterium.feld])
      .filter((wert): wert is number => typeof wert === "number");
    const mittel = schnitt(werte);
    if (mittel === null) return [];
    return [
      {
        feld: kriterium.feld,
        label: kriterium.label,
        stufen: kriterium.stufen,
        schnitt: mittel,
        schulnote: kriteriumAlsSchulnote(kriterium, mittel),
        anzahl: werte.length,
      },
    ];
  });

  const ernten = eintraege.filter((eintrag) => eintrag.honigGeerntet && eintrag.honigertragKg);

  return {
    kriterien,
    gesamtnote: schnitt(kriterien.map((kriterium) => kriterium.schulnote)),
    anzahlBewertungen: bewertungsEintraege.length,
    bebrueteteWabenSchnitt: schnitt(
      eintraege
        .map((eintrag) => eintrag.bebrueteteWaben)
        .filter((wert): wert is number => typeof wert === "number")
    ),
    brutwabenSchnitt: schnitt(
      eintraege
        .map((eintrag) => eintrag.brutwaben)
        .filter((wert): wert is number => typeof wert === "number")
    ),
    honigSummeKg: ernten.reduce((summe, eintrag) => summe + (eintrag.honigertragKg ?? 0), 0),
    anzahlErnten: ernten.length,
  };
}

/// Stufe als Text zum Durchschnittswert - "Ruhig" statt "3,7". Gerundet auf
/// die nächste Stufe, der genaue Wert steht daneben.
export function stufenText(kriterium: Kriteriumswert): string {
  const stufe = Math.round(kriterium.schnitt);
  return kriterium.stufen[Math.min(kriterium.stufen.length, Math.max(1, stufe)) - 1] ?? "";
}

/// Kurzfassung fürs PDF: "Sanftmut 3,7 - Schwarmtrieb 1,5 - ..."
export function leistungKurz(leistung: Leistung): string[] {
  return leistung.kriterien.map(
    (kriterium) => `${kriterium.label} ${kriterium.schnitt.toFixed(1).replace(".", ",")}`
  );
}

// Klassische Schulnoten-Einfärbung (1-2 grün, 3 gelb, 4 orange, 5-6 rot) -
// unabhängig von der Ampel der Beurteilungs-Schieberegler, die je Kriterium
// anders läuft.
export function schulnotenFarbe(note: number): string {
  if (note <= 2.5) return "bg-ok-flaeche text-ok";
  if (note <= 3.5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
  if (note <= 4.5) return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  return "bg-gefahr-flaeche text-gefahr";
}
