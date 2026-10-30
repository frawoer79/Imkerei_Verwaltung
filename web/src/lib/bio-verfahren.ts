// Biotechnische Verfahren gegen die Varroa: Totale Brutentnahme (TBE),
// Teil-Brutentnahme, Bannwabenverfahren und Königin käfigen. Sie brauchen
// kein Tierarzneimittel, gehören also nicht ins Bestandsbuch (§ 1 THAMNV gilt
// nur für Arzneimittel) und bleiben änderbar. Dafür hängen an ihnen feste
// Folgetermine, die als Maßnahmen je Volk angelegt werden - wie bei der
// Zuchtserie. Kommt ein Medikament dazu (Oxalsäure im brutfreien Volk), ist
// das ein eigener Schritt, der das Behandlungsformular vorausgefüllt öffnet.
//
// Drohnenbrut schneiden ist bewusst kein Verfahren, sondern ein Haken in der
// Durchsicht (Franks Vorgabe vom 19.10.2026).
//
// Quellen (abgerufen Oktober 2026):
// - lwg.bayern.de/mam/cms06/bienen/dateien/biotechnische-verfahren-2020.pdf
//   (TBE mit Sammelbrutablegern und Fangwabe; Bannwabe Tag 0/9/18/27/36;
//   Käfigen 25 Tage, Oxalsäure am Tag 25)
// - apis-ev.de Infobrief 2024/17 "Biotechnische Maßnahmen" (Fangwabe nach
//   etwa 9 Tagen; Käfigen Tag 9 Nachschaffungszellen; Befallskontrolle
//   frühestens 6 Wochen nach neuer Eiablage)
// - apis-ev.de Infobrief 2021/18 (Bannwabe 3 x 9 und 4 x 7)
// - bienen.ch Merkblatt 1.6.2 (Bannwabe 3 x 7: Tag 1/8/15/22/29)
// - varroaresistenzprojekt.eu und imkado.de (Bannwabe 2 x 12 mit
//   Doppeltasche: Tag 0/12/24)

import type { BioVerfahrenArt } from "@/generated/prisma/enums";

export const BIO_VERFAHREN_ARTEN: BioVerfahrenArt[] = ["TBE", "TEIL_BRUTENTNAHME", "BANNWABE", "KOENIGIN_KAEFIGEN", "SONSTIGES"];

export const BIO_VERFAHREN_LABEL: Record<BioVerfahrenArt, string> = {
  TBE: "Totale Brutentnahme (TBE)",
  TEIL_BRUTENTNAHME: "Teil-Brutentnahme",
  BANNWABE: "Bannwabenverfahren",
  KOENIGIN_KAEFIGEN: "Königin käfigen (Brutpause)",
  SONSTIGES: "Sonstiges Verfahren",
};

/// Kurzname als Vorsilbe der Maßnahmen ("Käfigen: Königin freilassen").
export const BIO_VERFAHREN_KURZ: Record<BioVerfahrenArt, string> = {
  TBE: "TBE",
  TEIL_BRUTENTNAHME: "Teil-Brutentnahme",
  BANNWABE: "Bannwabe",
  KOENIGIN_KAEFIGEN: "Käfigen",
  SONSTIGES: "Verfahren",
};

/// Eine Zeile Erklärung unter der Auswahl im Formular.
export const BIO_VERFAHREN_ERKLAERUNG: Record<BioVerfahrenArt, string> = {
  TBE: "Alle Brutwaben raus, das Volk bleibt mit der Königin auf hellem Bau.",
  TEIL_BRUTENTNAHME: "Ein Teil der Brutwaben raus, meist für Ableger oder einen Brutsammler.",
  BANNWABE: "Die Königin legt nur auf Bannwaben. Die verdeckelten Bannwaben kommen raus.",
  KOENIGIN_KAEFIGEN: "Die Königin sitzt 25 Tage im Käfig. Danach ist das Volk brutfrei.",
  SONSTIGES: "Ein anderes Verfahren ohne Medikament.",
};

export const VERBLEIB_LABEL: Record<string, string> = {
  BRUTSAMMLER: "Brutsammler",
  ABLEGER: "Ableger",
  EINGESCHMOLZEN: "Eingeschmolzen",
};

/// Welche Verbleib-Optionen je Verfahren angeboten werden.
export function verbleibOptionen(art: BioVerfahrenArt): string[] {
  if (art === "TBE") return ["BRUTSAMMLER", "EINGESCHMOLZEN"];
  if (art === "TEIL_BRUTENTNAHME") return ["ABLEGER", "BRUTSAMMLER", "EINGESCHMOLZEN"];
  return [];
}

export type VerfahrenOptionen = {
  verbleib?: string | null;
  fangwabe?: boolean;
  bannwabeVariante?: string | null;
};

/// Rhythmen des Bannwabenverfahrens. Gespeichert wird der Schlüssel, leer
/// heißt 3 x 9 (so liefen alle Verfahren vor der Auswahl).
export const BANNWABE_VARIANTEN = ["3x9", "3x7", "4x7", "2x12"] as const;
export type BannwabeVariante = (typeof BANNWABE_VARIANTEN)[number];

export const BANNWABE_VARIANTE_LABEL: Record<BannwabeVariante, string> = {
  "3x9": "3 × 9 Tage",
  "3x7": "3 × 7 Tage",
  "4x7": "4 × 7 Tage",
  "2x12": "2 × 12 Tage (12/24)",
};

export const BANNWABE_VARIANTE_ERKLAERUNG: Record<BannwabeVariante, string> = {
  "3x9": "Drei Bannwaben je 9 Tage, die Königin ist 27 Tage gesperrt. Ablauf nach LWG Bayern.",
  "3x7": "Drei Bannwaben je 7 Tage, die Königin ist 21 Tage gesperrt. Ablauf nach apisuisse.",
  "4x7": "Vier Bannwaben je 7 Tage, die Königin ist 28 Tage gesperrt. Immer am gleichen Wochentag.",
  "2x12": "Doppeltasche mit zwei Waben. Die Königin wird nur einmal gefangen und ist 24 Tage gesperrt.",
};

export function bannwabeVariante(wert: string | null | undefined): BannwabeVariante {
  return BANNWABE_VARIANTEN.find((eintrag) => eintrag === wert) ?? "3x9";
}

/// Bannwaben in festem Takt: alle `tage` Tage kommt die Königin auf eine neue
/// Wabe, die vorletzte ist dann verdeckelt und kommt raus. Die Schlüssel sind
/// dieselben wie beim früheren festen 3 x 9-Plan.
function bannwabenSchritte(variante: BannwabeVariante): VerfahrenSchritt[] {
  if (variante === "2x12") {
    return [
      {
        schluessel: "BANNWABE_1",
        tag: 0,
        titel: "Königin in die Doppeltasche sperren",
        hinweis: "Eine leere, ausgebaute Wabe und eine Mittelwand in die Tasche.",
      },
      {
        schluessel: "BANNWABE_2",
        tag: 12,
        titel: "Verdeckelte Bannwabe entnehmen, leere Wabe einsetzen",
        hinweis: "Bannwabe einschmelzen. Die Königin bleibt in der Tasche.",
      },
      {
        schluessel: "KOENIGIN_FREI",
        tag: 24,
        titel: "Königin freilassen, beide Bannwaben entnehmen",
        hinweis: "Bannwaben einschmelzen, Mittelwände einhängen.",
      },
      { schluessel: "WEISELRICHTIG", tag: 31, titel: "Weiselrichtigkeit prüfen", hinweis: "Stifte suchen." },
    ];
  }
  const [anzahl, tage] = variante.split("x").map(Number);
  const schritte: VerfahrenSchritt[] = [
    { schluessel: "BANNWABE_1", tag: 0, titel: "Königin auf Bannwabe 1 sperren", hinweis: "Leere, ausgebaute Wabe in der Wabentasche." },
  ];
  for (let wabe = 2; wabe <= anzahl; wabe++) {
    const raus = wabe - 2;
    schritte.push({
      schluessel: `BANNWABE_${wabe}`,
      tag: (wabe - 1) * tage,
      titel: `Königin auf Bannwabe ${wabe} setzen${raus > 0 ? `, Bannwabe ${raus} entnehmen` : ""}`,
      hinweis: `Bannwabe ${wabe - 1} neben die Tasche hängen.${raus > 0 ? ` Bannwabe ${raus} ist verdeckelt: einschmelzen.` : ""}`,
    });
  }
  schritte.push(
    {
      schluessel: "KOENIGIN_FREI",
      tag: anzahl * tage,
      titel: `Königin freilassen, Bannwabe ${anzahl - 1} entnehmen`,
      hinweis: `Bannwabe ${anzahl} bleibt noch ${tage} Tage im Volk.`,
    },
    {
      schluessel: `BANNWABE_${anzahl}_ENTNEHMEN`,
      tag: (anzahl + 1) * tage,
      titel: `Bannwabe ${anzahl} entnehmen, Weiselrichtigkeit prüfen`,
      hinweis: "Stifte suchen.",
    }
  );
  return schritte;
}

export type VerfahrenSchritt = {
  schluessel: string;
  /// Tage nach dem Beginn.
  tag: number;
  titel: string;
  hinweis: string;
  /// Hier kommt ein Tierarzneimittel dazu - der Schritt wird über das
  /// Behandlungsformular erledigt, damit der Nachweis entsteht.
  medikament?: boolean;
};

const BEFALL: VerfahrenSchritt = {
  schluessel: "BEFALL_KONTROLLIEREN",
  tag: 42,
  titel: "Befall kontrollieren",
  hinweis: "Windel oder Puderzucker. Sinnvoll frühestens 6 Wochen, nachdem die Königin wieder legt.",
};

/// Fahrplan eines Verfahrens. Tag 0 ist immer der Eingriff selbst.
export function verfahrenSchritte(art: BioVerfahrenArt, optionen: VerfahrenOptionen = {}): VerfahrenSchritt[] {
  switch (art) {
    case "TBE":
      return [
        {
          schluessel: "BRUT_ENTNEHMEN",
          tag: 0,
          titel: "Alle Brutwaben entnehmen",
          hinweis: "Volk mit Königin auf hellen Waben oder Mittelwänden lassen.",
        },
        optionen.fangwabe
          ? {
              schluessel: "FANGWABE_ENTNEHMEN",
              tag: 9,
              titel: "Fangwabe entnehmen und einschmelzen",
              hinweis: "Sobald sie verdeckelt ist. Die Milben sitzen darin.",
            }
          : {
              schluessel: "VOLK_OXALSAEURE",
              tag: 0,
              titel: "Volk mit Oxalsäure behandeln",
              hinweis: "Das Volk ist jetzt brutfrei. Sprühen oder träufeln, Honig vorher ernten.",
              medikament: true,
            },
        ...(optionen.verbleib === "BRUTSAMMLER"
          ? [
              {
                schluessel: "BRUTSAMMLER_OXALSAEURE",
                tag: 21,
                titel: "Brutsammler mit Oxalsäure behandeln",
                hinweis: "Die Brut ist geschlüpft (Tag 21 bis 24). Die Behandlung gilt dem Brutsammler.",
                medikament: true,
              },
            ]
          : []),
        BEFALL,
      ];
    case "TEIL_BRUTENTNAHME":
      return [
        {
          schluessel: "BRUT_ENTNEHMEN",
          tag: 0,
          titel: "Brutwaben entnehmen",
          hinweis: "",
        },
        ...(optionen.verbleib === "ABLEGER" || optionen.verbleib === "BRUTSAMMLER"
          ? [
              {
                schluessel: "ABLEGER_OXALSAEURE",
                tag: 21,
                titel: `${optionen.verbleib === "ABLEGER" ? "Ableger" : "Brutsammler"} mit Oxalsäure behandeln`,
                hinweis: "Die Brut ist geschlüpft (Tag 21 bis 24).",
                medikament: true,
              },
            ]
          : []),
        BEFALL,
      ];
    case "BANNWABE":
      return bannwabenSchritte(bannwabeVariante(optionen.bannwabeVariante));
    case "KOENIGIN_KAEFIGEN":
      return [
        {
          schluessel: "KAEFIGEN",
          tag: 0,
          titel: "Königin käfigen",
          hinweis: "Durchlaufkäfig mittig in den oberen Brutraum. Kein Versand- oder Zusetzkäfig.",
        },
        { schluessel: "ZELLEN_BRECHEN", tag: 9, titel: "Nachschaffungszellen brechen", hinweis: "" },
        {
          schluessel: "KOENIGIN_FREI",
          tag: 25,
          titel: "Königin freilassen",
          hinweis: "Käfigwabe gegen Leerwabe oder Mittelwand tauschen.",
        },
        {
          schluessel: "VOLK_OXALSAEURE",
          tag: 25,
          titel: "Volk mit Oxalsäure behandeln",
          hinweis: "Das Volk ist jetzt brutfrei. Sprühen oder träufeln.",
          medikament: true,
        },
        { ...BEFALL, tag: 67 },
      ];
    case "SONSTIGES":
      return [{ schluessel: "DURCHGEFUEHRT", tag: 0, titel: "Durchgeführt", hinweis: "" }];
  }
}

/// Termin eines Schritts. Wie alle Datumsfelder der App liegt der Beginn auf
/// UTC-Mitternacht (so speichert ein <input type="date"> ihn ab), deshalb
/// genügt es, ganze Tage aufzuaddieren (wie bei der Zuchtserie).
export function schrittDatum(beginn: Date, tag: number): Date {
  return new Date(beginn.getTime() + tag * 24 * 60 * 60 * 1000);
}

/// Text der Maßnahme zu einem Schritt.
export function schrittText(art: BioVerfahrenArt, bezeichnung: string | null, schritt: VerfahrenSchritt): string {
  const kurz = art === "SONSTIGES" && bezeichnung ? bezeichnung : BIO_VERFAHREN_KURZ[art];
  return `${kurz}: ${schritt.titel}`;
}

export function verfahrenTitel(art: BioVerfahrenArt, bezeichnung: string | null): string {
  return art === "SONSTIGES" && bezeichnung ? bezeichnung : BIO_VERFAHREN_LABEL[art];
}

/// Verfahren, bei denen die Königin festgesetzt wird - die kommen in ihren
/// Lebenslauf.
export function betrifftKoenigin(art: BioVerfahrenArt): boolean {
  return art === "BANNWABE" || art === "KOENIGIN_KAEFIGEN";
}

/// Link zum Behandlungsformular für einen Medikamenten-Schritt.
export function behandlungLink(verfahrenId: string, schluessel: string, volkId?: string): string {
  const parameter = new URLSearchParams({ verfahren: verfahrenId, schritt: schluessel });
  if (volkId) parameter.set("volk", volkId);
  return `/behandlungen/neu?${parameter.toString()}`;
}

export type SchrittStand = { schluessel: string; erledigt: boolean };

/// "Schritt 3 von 5": gezählt werden Schritte, die für alle Völker erledigt
/// sind. Abgeschlossen ist das Verfahren, wenn nichts mehr offen ist.
export function verfahrenFortschritt(schritte: VerfahrenSchritt[], massnahmen: SchrittStand[]) {
  const erledigt = schritte.filter((schritt) => {
    const zugehoerig = massnahmen.filter((massnahme) => massnahme.schluessel === schritt.schluessel);
    return zugehoerig.length === 0 || zugehoerig.every((massnahme) => massnahme.erledigt);
  }).length;
  return { erledigt, gesamt: schritte.length, abgeschlossen: erledigt === schritte.length };
}
