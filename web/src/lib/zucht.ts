// Zeitplan der Königinnenzucht. Alle Termine hängen am Umlarvtag (Tag 0):
// die Entwicklung der Königin läuft fest getaktet (Ei 3 Tage, Larve bis zur
// Verdeckelung 5 Tage, Schlupf 16 Tage nach der Eiablage), deshalb lassen sich
// alle Schritte davor und danach vom Umlarvtermin aus ausrechnen. Wetter und
// Volksstärke verschieben einzelne Schritte in der Praxis um ein, zwei Tage -
// die Termine sind Richtwerte, keine Vorschrift.
//
// Quellen (abgerufen Oktober 2026):
// - lokalbee.com/koeniginnenzucht-kalender (Tag -9/-1 Vorbereitung,
//   +1 Annahme, +5 Verdeckelung, +10/11 Käfigen, +12 Schlupf, +13
//   Belegstelle, ca. +28 Stifte)
// - imker.felser.ch/imkerwiki (Tag -9 Pflegevolk, +11 Verschulen in
//   Begattungseinheiten, +12 Schlupf, +13 Schlupfkontrolle)
// - imkerei-bad-oldesloe.de/blog/zeitfaktor-in-der-koeniginnenzucht.html
//   (Hochzeitsflug +18-20, Eilage ab +27, Brutbild ca. +39-41)
// - lwg.bayern.de/mam/cms06/bienen/dateien/aufzuchtmethoden.pdf
//   (Pflegeverfahren: weisellos, Anbrütekasten ca. 30 h dann Endpflege im
//   weiselrichtigen Volk, Sammelbrutableger, weiselrichtig, Starter-Finisher
//   2-3 Tage Anpflege)
// - laves.niedersachsen.de/download/143079 (Sammelbrutableger, Vorbrüter)

/// Bei welchem Volk der Schritt als Maßnahme landet.
export type ZuchtSchrittVolk = "zucht" | "pflege";

export type ZuchtSchritt = {
  schluessel: string;
  /// Tage relativ zum Umlarven (negativ = davor).
  tag: number;
  titel: string;
  hinweis: string;
  volk: ZuchtSchrittVolk;
  /// Voreinstellung fürs Kalender-Abo, wenn der Schritt angelegt wird -
  /// nur die Termine, an denen am Volk wirklich etwas zu tun ist. Lässt
  /// sich je Serie und Schritt umstellen.
  kalender?: boolean;
};

export const ZUCHT_SCHRITTE: ZuchtSchritt[] = [
  {
    schluessel: "PFLEGEVOLK_VORBEREITEN",
    kalender: true,
    tag: -9,
    titel: "Pflegevolk vorbereiten",
    hinweis:
      "Pflegevolk weisellos machen bzw. Königin absperren oder Sammelbrutableger bilden, damit am Umlarvtag keine offene Brut mehr da ist. Beim Starter-Verfahren reicht der Vortag.",
    volk: "pflege",
  },
  {
    schluessel: "ZUCHTWABE_EINHAENGEN",
    kalender: true,
    tag: -4,
    titel: "Zuchtmutter: Wabe zum Bestiften einhängen",
    hinweis:
      "Ausgebaute, bebrütete Wabe ins Zuchtvolk hängen. Aus den Eiern schlüpfen nach drei Tagen die Larven, am Umlarvtag sind sie dann etwa einen Tag alt.",
    volk: "zucht",
  },
  {
    schluessel: "ZUCHTRAHMEN_ANWAERMEN",
    tag: -1,
    titel: "Zuchtrahmen anwärmen, Pflegevolk füttern",
    hinweis:
      "Zuchtrahmen mit leeren Weiselbechern ins Pflegevolk hängen, damit die Bienen sie putzen und anwärmen. Pflegevolk flüssig füttern.",
    volk: "pflege",
  },
  {
    schluessel: "UMLARVEN",
    kalender: true,
    tag: 0,
    titel: "Umlarven",
    hinweis:
      "Larven (höchstens 24 Stunden alt) aus der Zuchtwabe in die Weiselbecher übertragen. Vorher im Pflegevolk alle Nachschaffungszellen ausbrechen.",
    volk: "pflege",
  },
  {
    schluessel: "ANNAHME_KONTROLLIEREN",
    tag: 1,
    titel: "Annahme kontrollieren",
    hinweis: "Angenommene Zellen zählen. Bei schlechter Annahme kann sofort nachgelarvt werden.",
    volk: "pflege",
  },
  {
    schluessel: "VERDECKELUNG_KONTROLLIEREN",
    tag: 5,
    titel: "Verdeckelung kontrollieren",
    hinweis:
      "Die Zellen sind jetzt verdeckelt. Im Pflegevolk wilde Nachschaffungszellen ausbrechen. Zellen ab jetzt nicht mehr drehen oder stoßen.",
    volk: "pflege",
  },
  {
    schluessel: "ZELLEN_KAEFIGEN",
    kalender: true,
    tag: 10,
    titel: "Zellen käfigen, Begattungseinheiten vorbereiten",
    hinweis:
      "Reife Zellen in Schlupfkäfige setzen, damit die erste Königin die anderen nicht absticht. Begattungskästchen und Bienen bereitstellen.",
    volk: "pflege",
  },
  {
    schluessel: "VERSCHULEN",
    kalender: true,
    tag: 11,
    titel: "Begattungseinheiten bilden, Zellen verschulen",
    hinweis: "Je eine reife Zelle in eine Begattungseinheit (z.B. EWK, Mini Plus) mit Bienen und Futter geben.",
    volk: "pflege",
  },
  {
    schluessel: "SCHLUPF_KONTROLLIEREN",
    tag: 12,
    titel: "Schlupf kontrollieren, Königinnen erfassen",
    hinweis:
      "Die Königinnen schlüpfen. Geschlüpfte zählen und in der Zuchtserie als Königinnen anlegen, dann steht ihre Abstammung fest.",
    volk: "pflege",
  },
  {
    schluessel: "ZUR_BEGATTUNG",
    kalender: true,
    tag: 13,
    titel: "Begattungseinheiten zur Belegstelle bzw. an den Begattungsstand",
    hinweis:
      "Unbegattete Königinnen in den ersten Tagen nach dem Schlupf auffahren. Die Hochzeitsflüge folgen etwa ab Tag 18 bis 20.",
    volk: "pflege",
  },
  {
    schluessel: "EILAGE_KONTROLLIEREN",
    kalender: true,
    tag: 28,
    titel: "Eilage kontrollieren",
    hinweis: "Nach Stiften suchen. Ohne Eilage einige Tage später nochmal nachsehen, dann ggf. ausmerzen.",
    volk: "pflege",
  },
  {
    schluessel: "BRUTBILD_ZEICHNEN",
    tag: 40,
    titel: "Brutbild beurteilen, zeichnen, einweiseln",
    hinweis:
      "Geschlossenes Brutbild ist der erste Leistungsnachweis. Königin zeichnen und in ein Volk oder einen Ableger geben.",
    volk: "pflege",
  },
];

// --- Pflegeart ----------------------------------------------------------------
//
// Wie die Zellen gepflegt werden, ändert vor allem die Vorbereitung und ob
// der Zuchtrahmen nach dem Anpflegen umgehängt wird. Die übrigen Schritte
// (Verdeckelung, Käfigen, Schlupf, Begattung) sind bei allen gleich.

export const PFLEGEARTEN = [
  "UNBEKANNT",
  "WEISELLOS",
  "WEISELRICHTIG",
  "SAMMELBRUTABLEGER",
  "ANBRUETER",
  "STARTER_FINISHER",
] as const;
export type Pflegeart = (typeof PFLEGEARTEN)[number];

export const PFLEGEART_LABEL: Record<Pflegeart, string> = {
  UNBEKANNT: "nicht angegeben",
  WEISELLOS: "Weiselloses Pflegevolk",
  WEISELRICHTIG: "Weiselrichtiges Pflegevolk (Königin abgesperrt)",
  SAMMELBRUTABLEGER: "Sammelbrutableger",
  ANBRUETER: "Anbrüter, danach Pflegevolk",
  STARTER_FINISHER: "Starter und Finisher",
};

/// Kurze Erklärung unter der Auswahl.
export const PFLEGEART_HINWEIS: Record<Pflegeart, string> = {
  UNBEKANNT: "Allgemeiner Zeitplan ohne Besonderheiten eines Verfahrens.",
  WEISELLOS:
    "Starkes Volk wird am Umlarvtag entweiselt und pflegt die Zellen von Anfang bis Ende.",
  WEISELRICHTIG:
    "Die Königin bleibt im Volk, aber hinter dem Absperrgitter. Die Zellen hängen im brutfreien Teil über offener Brut.",
  SAMMELBRUTABLEGER:
    "Ableger aus Brutwaben mehrerer Völker, 9 Tage vor dem Umlarven gebildet. Am Umlarvtag Nachschaffungszellen ausbrechen.",
  ANBRUETER:
    "Kiste mit weisellosen jungen Bienen pflegt die Larven etwa einen Tag an, danach kommt der Zuchtrahmen zur Endpflege ins Pflegevolk.",
  STARTER_FINISHER:
    "Weiselloses, brutfreies Startervolk pflegt 2-3 Tage an, das weiselrichtige Finishervolk pflegt fertig.",
};

/// Bezeichnung des Volkes, das in der Auswahl darunter gewählt wird.
export const PFLEGEVOLK_LABEL: Record<Pflegeart, string> = {
  UNBEKANNT: "Pflegevolk",
  WEISELLOS: "Pflegevolk",
  WEISELRICHTIG: "Pflegevolk",
  SAMMELBRUTABLEGER: "Sammelbrutableger (Volk)",
  ANBRUETER: "Pflegevolk für die Endpflege",
  STARTER_FINISHER: "Finisher (Volk für die Endpflege)",
};

type SchrittAenderung = Partial<Pick<ZuchtSchritt, "tag" | "titel" | "hinweis">>;

const PFLEGEART_AENDERUNGEN: Record<Pflegeart, Record<string, SchrittAenderung>> = {
  UNBEKANNT: {},
  WEISELLOS: {
    PFLEGEVOLK_VORBEREITEN: {
      titel: "Pflegevolk vorbereiten: Königin absperren",
      hinweis:
        "Königin im unteren Brutraum absperren oder in eine Wabentasche setzen. Am Umlarvtag wird sie mit ihren Brutwaben entnommen, dann ist oben keine offene Brut mehr.",
    },
    UMLARVEN: {
      hinweis:
        "Königin mit Brutwaben aus dem Pflegevolk nehmen, Nachschaffungszellen ausbrechen. Nach 2-3 Stunden den Zuchtrahmen mit den umgelarvten Larven (höchstens 24 Stunden alt) geben.",
    },
  },
  WEISELRICHTIG: {
    PFLEGEVOLK_VORBEREITEN: {
      titel: "Pflegevolk vorbereiten: Königin absperren, Brut nach oben",
      hinweis:
        "Königin unter das Absperrgitter, offene Brut nach oben hängen. Bis zum Umlarvtag ist die Brut oben verdeckelt, dort entsteht der Pflegeraum.",
    },
    UMLARVEN: {
      hinweis:
        "Im oberen Teil Nachschaffungszellen ausbrechen, dann den Zuchtrahmen mit den umgelarvten Larven (höchstens 24 Stunden alt) zwischen offene Brutwaben hängen.",
    },
  },
  SAMMELBRUTABLEGER: {
    PFLEGEVOLK_VORBEREITEN: {
      titel: "Sammelbrutableger bilden",
      hinweis:
        "Brutwaben mit ansitzenden Bienen aus mehreren Völkern zu einem weisellosen Ableger zusammenstellen, Futter- und Pollenwabe dazu. Bis zum Umlarvtag ist die offene Brut verdeckelt.",
    },
    UMLARVEN: {
      hinweis:
        "Im Sammelbrutableger alle Nachschaffungszellen ausbrechen. Nach 2-3 Stunden den Zuchtrahmen mittig zwischen zwei Brutwaben hängen.",
    },
  },
  ANBRUETER: {
    PFLEGEVOLK_VORBEREITEN: {
      titel: "Pflegevolk für die Endpflege vorbereiten",
      hinweis:
        "Königin unter das Absperrgitter, offene Brut nach oben hängen. Dort wird der angepflegte Zuchtrahmen später fertig gepflegt.",
    },
    UMLARVEN: {
      titel: "Anbrüter befüllen, umlarven",
      hinweis:
        "Anbrüter mit Futter-, Pollen- und Wasserwabe vorbereiten, reichlich junge Bienen einfegen. Nach etwa 2 Stunden den Zuchtrahmen mit den umgelarvten Larven geben.",
    },
    ANNAHME_KONTROLLIEREN: {
      titel: "Annahme kontrollieren, Zuchtrahmen ins Pflegevolk",
      hinweis:
        "Nach etwa 30 Stunden angenommene Zellen zählen und den Zuchtrahmen zur Endpflege ins Pflegevolk über das Absperrgitter hängen. Bienen des Anbrüters zurückgeben.",
    },
  },
  STARTER_FINISHER: {
    PFLEGEVOLK_VORBEREITEN: {
      titel: "Finisher vorbereiten: Königin absperren, Brut nach oben",
      hinweis:
        "Im Finisher die Königin unter das Absperrgitter, offene Brut nach oben hängen. Der Starter wird am Vortag weisellos und brutfrei gemacht.",
    },
    ZUCHTRAHMEN_ANWAERMEN: {
      titel: "Starter einrichten, Zuchtrahmen anwärmen",
      hinweis:
        "Starter weisellos und ohne offene Brut, mit vielen jungen Bienen, Futter und Pollen. Zuchtrahmen mit leeren Weiselbechern zum Anwärmen hineinhängen.",
    },
    UMLARVEN: {
      hinweis: "Larven (höchstens 24 Stunden alt) umlarven und den Zuchtrahmen in den Starter hängen.",
    },
    ANNAHME_KONTROLLIEREN: {
      titel: "Annahme kontrollieren",
      hinweis: "Angenommene Zellen im Starter zählen. Bei schlechter Annahme kann sofort nachgelarvt werden.",
    },
  },
};

/// Zusätzlicher Schritt beim Starter-Finisher-Verfahren: nach 2-3 Tagen
/// Anpflege wird der Zuchtrahmen umgehängt.
const STARTER_UMHAENGEN: ZuchtSchritt = {
  schluessel: "IN_FINISHER_UMHAENGEN",
  kalender: true,
  tag: 2,
  titel: "Zuchtrahmen vom Starter in den Finisher",
  hinweis:
    "Nach 2-3 Tagen Anpflege den Zuchtrahmen in den Finisher über das Absperrgitter hängen. Dort werden die Zellen fertig gepflegt und verdeckelt.",
  volk: "pflege",
};

const BRUTSCHRANK_AENDERUNGEN: Record<string, SchrittAenderung> = {
  ZELLEN_KAEFIGEN: {
    titel: "Zellen käfigen, in den Brutschrank",
    hinweis:
      "Reife Zellen in Schlupfkäfige setzen und in den Brutschrank stellen (etwa 34-35 °C, 60-70 % Luftfeuchte). Begattungseinheiten vorbereiten.",
  },
  VERSCHULEN: {
    tag: 12,
    titel: "Geschlüpfte Königinnen in Begattungseinheiten",
    hinweis:
      "Die im Brutschrank geschlüpften Königinnen möglichst bald (wenige Stunden alt) in Begattungseinheiten (z.B. EWK, Mini Plus) mit Bienen und Futter zusetzen.",
  },
  SCHLUPF_KONTROLLIEREN: {
    titel: "Schlupf im Brutschrank, Königinnen erfassen",
  },
};

/// Die Schritte einer Serie - je nach Pflegeart und Brutschrank angepasst.
/// Die Schlüssel bleiben dieselben, damit vorhandene Maßnahmen beim Wechsel
/// der Pflegeart weiterverwendet werden.
export function zuchtSchritte(pflegeart: Pflegeart = "UNBEKANNT", brutschrank = false): ZuchtSchritt[] {
  const aenderungen = PFLEGEART_AENDERUNGEN[pflegeart] ?? {};
  const schritte = ZUCHT_SCHRITTE.map((schritt) => ({
    ...schritt,
    ...aenderungen[schritt.schluessel],
    ...(brutschrank ? BRUTSCHRANK_AENDERUNGEN[schritt.schluessel] : {}),
  }));
  if (pflegeart === "STARTER_FINISHER") schritte.push(STARTER_UMHAENGEN);
  // Mit Brutschrank fallen Schlupf und Zusetzen auf denselben Tag - erst
  // schlüpfen, dann zusetzen.
  const reihenfolge = (schritt: ZuchtSchritt) =>
    brutschrank && schritt.schluessel === "VERSCHULEN" ? 1 : 0;
  return schritte.sort((a, b) => a.tag - b.tag || reihenfolge(a) - reihenfolge(b));
}

/// Titel eines Schritts zum Schlüssel, auch für Schritte, die nur einige
/// Pflegearten haben (z.B. Übersicht der laufenden Serien).
export function zuchtSchrittFinden(
  schluessel: string,
  pflegeart: Pflegeart = "UNBEKANNT",
  brutschrank = false
): ZuchtSchritt | undefined {
  return zuchtSchritte(pflegeart, brutschrank).find((schritt) => schritt.schluessel === schluessel);
}

const TAG_MS = 24 * 60 * 60 * 1000;

/// Datum eines Schritts. Die Termine liegen wie alle Datumsfelder der App auf
/// UTC-Mitternacht (so speichert ein <input type="date"> sie ab), deshalb
/// genügt es, ganze Tage aufzuaddieren.
export function schrittDatum(umlarvDatum: Date, tag: number): Date {
  return new Date(umlarvDatum.getTime() + tag * TAG_MS);
}

/// "Tag −4", "Tag 0", "Tag +12" - wie in Zuchtkalendern üblich.
export function tagText(tag: number): string {
  if (tag === 0) return "Tag 0";
  return tag < 0 ? `Tag −${-tag}` : `Tag +${tag}`;
}

/// Schlupftag laut Plan - für die nachgezogenen Königinnen.
export const SCHLUPF_TAG = 12;

/// Text der Maßnahme, wie sie in der Liste und im Kalender erscheint.
export function massnahmeText(bezeichnung: string, schritt: ZuchtSchritt): string {
  return `Zucht ${bezeichnung}: ${schritt.titel}`;
}
