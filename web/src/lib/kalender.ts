import { massnahmenGruppieren } from "@/lib/massnahmen-gruppen";

// Baut aus den offenen Maßnahmen einen Kalender im iCalendar-Format (.ics).
// Den Feed abonniert man einmal am iPhone/iPad/Rechner, danach stehen alle
// terminierten Maßnahmen im Kalender und werden bei Änderungen automatisch
// nachgezogen.

// --- Einstellbares -----------------------------------------------------------

/// Wann die Erinnerung kommt. Ein ganztägiger Termin beginnt um 0 Uhr, deshalb
/// sind die Auslöser negativ gerechnet: -PT14H sind 14 Stunden davor, also
/// 10 Uhr am Vortag.
export const ERINNERUNGEN = [
  { wert: "VORTAG_10", label: "Am Vortag um 10 Uhr", ausloeser: "-PT14H" },
  { wert: "VORTAG_18", label: "Am Vortag um 18 Uhr", ausloeser: "-PT6H" },
  { wert: "TAG_07", label: "Am Termintag um 7 Uhr", ausloeser: "PT7H" },
  { wert: "ZWEI_TAGE_10", label: "Zwei Tage vorher um 10 Uhr", ausloeser: "-P1DT14H" },
  { wert: "WOCHE_10", label: "Eine Woche vorher um 10 Uhr", ausloeser: "-P6DT14H" },
  { wert: "KEINE", label: "Keine Erinnerung", ausloeser: null },
] as const;

export const ERINNERUNG_STANDARD = "VORTAG_10";

/// Farbe der Termine. `css` ist der Farbname nach RFC 7986, `hex` der Wert für
/// Apples eigene Erweiterung - beide werden mitgeschickt, weil sich die
/// Kalender-Apps uneinig sind, welche davon sie lesen.
export const KALENDER_FARBEN = [
  { wert: "STANDARD", label: "Wie in der Kalender-App eingestellt", css: null, hex: null },
  { wert: "HONIGGELB", label: "Honiggelb", css: "goldenrod", hex: "#DAA520" },
  { wert: "GRUEN", label: "Grün", css: "seagreen", hex: "#2E8B57" },
  { wert: "ORANGE", label: "Orange", css: "darkorange", hex: "#FF8C00" },
  { wert: "ROT", label: "Rot", css: "crimson", hex: "#DC143C" },
  { wert: "BLAU", label: "Blau", css: "steelblue", hex: "#4682B4" },
  { wert: "VIOLETT", label: "Violett", css: "purple", hex: "#800080" },
  { wert: "GRAU", label: "Grau", css: "slategray", hex: "#708090" },
] as const;

export const FARBE_STANDARD = "STANDARD";

/// Platzhalter, die im Titelmuster ersetzt werden.
export const TITEL_PLATZHALTER = ["{massnahme}", "{volk}", "{stand}"];
export const TITEL_STANDARD = "{massnahme} – {volk}";

export type KalenderEinstellungen = {
  erinnerung?: string | null;
  farbe?: string | null;
  titelMuster?: string | null;
};

export function titelBauen(
  muster: string | null | undefined,
  werte: { massnahme: string; volk: string; stand: string }
): string {
  const vorlage = muster?.trim() || TITEL_STANDARD;
  const titel = vorlage
    .replaceAll("{massnahme}", werte.massnahme)
    .replaceAll("{volk}", werte.volk)
    .replaceAll("{stand}", werte.stand)
    .trim();
  // Ein Muster ohne jeden Platzhalter wäre bei allen Terminen gleich - dann
  // lieber wenigstens die Maßnahme dranhängen.
  return titel === "" ? werte.massnahme : titel;
}

export type KalenderMassnahme = {
  id: string;
  text: string;
  faelligAm: Date;
  createdAt: Date;
  volkName: string;
  bienenstandName: string;
  bienenstandOrt: string | null;
};

/// Ein Termin im Kalender. Eine Maßnahme, die in einem Rutsch für mehrere
/// Völker angelegt wurde, ist ein einziger Termin - nach derselben Regel wie
/// auf der Maßnahmen-Seite (lib/massnahmen-gruppen.ts).
type KalenderTermin = {
  uid: string;
  text: string;
  faelligAm: Date;
  massnahmen: KalenderMassnahme[];
};

function termineBilden(massnahmen: KalenderMassnahme[]): KalenderTermin[] {
  return massnahmenGruppieren(massnahmen.map((massnahme) => ({ ...massnahme, zuchtserie: null }))).map(
    (eintrag) => {
      const gruppe = eintrag.art === "einzeln" ? [eintrag.massnahme] : eintrag.massnahmen;
      const erste = gruppe[0]!;
      // Die Kennung muss von Abruf zu Abruf gleich bleiben, sonst sieht die
      // Kalender-App jedes Mal einen neuen Termin. Einzelne Maßnahmen behalten
      // ihre bisherige Kennung, Gruppen nehmen die kleinste Maßnahmen-ID.
      const uid =
        gruppe.length === 1
          ? `massnahme-${erste.id}`
          : `massnahmen-${gruppe.map((massnahme) => massnahme.id).sort()[0]}`;
      return { uid: `${uid}@imkereiverwaltung`, text: erste.text, faelligAm: erste.faelligAm, massnahmen: gruppe };
    }
  );
}

const namensSortierung = new Intl.Collator("de", { numeric: true });

/// Für Titel und Erinnerung: "Volk 3" oder "14 Völker", "Dachtel" oder "2 Stände".
function volkUndStand(termin: KalenderTermin): { volk: string; stand: string; staende: Map<string, KalenderMassnahme[]> } {
  const staende = new Map<string, KalenderMassnahme[]>();
  for (const massnahme of termin.massnahmen) {
    staende.set(massnahme.bienenstandName, [...(staende.get(massnahme.bienenstandName) ?? []), massnahme]);
  }
  const anzahl = termin.massnahmen.length;
  return {
    volk: anzahl === 1 ? termin.massnahmen[0]!.volkName : `${anzahl} Völker`,
    stand: staende.size === 1 ? [...staende.keys()][0]! : `${staende.size} Stände`,
    staende,
  };
}

// iCalendar erlaubt nur 75 Oktett je Zeile; längere werden umgebrochen und in
// der Folgezeile mit einem Leerzeichen eingerückt. Manche Kalender-Apps sind
// da streng, deshalb halten wir uns dran.
function zeileFalten(zeile: string): string {
  const bytes = Buffer.from(zeile, "utf8");
  if (bytes.length <= 75) return zeile;

  const teile: string[] = [];
  let rest = bytes;
  let grenze = 75;
  while (rest.length > grenze) {
    // Nicht mitten in ein Mehrbyte-Zeichen (z.B. Umlaut) schneiden.
    let schnitt = grenze;
    while (schnitt > 0 && (rest[schnitt] & 0xc0) === 0x80) schnitt--;
    teile.push(rest.subarray(0, schnitt).toString("utf8"));
    rest = rest.subarray(schnitt);
    grenze = 74; // Folgezeilen beginnen mit einem Leerzeichen
  }
  teile.push(rest.toString("utf8"));
  return teile.join("\r\n ");
}

// Sonderzeichen, die in iCalendar eine eigene Bedeutung haben, maskieren.
function textMaskieren(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function alsDatum(datum: Date): string {
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}${zweistellig(datum.getMonth() + 1)}${zweistellig(datum.getDate())}`;
}

function alsZeitstempel(datum: Date): string {
  return `${datum.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function tagSpaeter(datum: Date): Date {
  const naechster = new Date(datum);
  naechster.setDate(naechster.getDate() + 1);
  return naechster;
}

export function kalenderErzeugen(
  massnahmen: KalenderMassnahme[],
  einstellungen: KalenderEinstellungen = {},
  jetzt: Date = new Date()
): string {
  const erinnerung =
    ERINNERUNGEN.find((eintrag) => eintrag.wert === einstellungen.erinnerung) ??
    ERINNERUNGEN.find((eintrag) => eintrag.wert === ERINNERUNG_STANDARD)!;
  const farbe = KALENDER_FARBEN.find((eintrag) => eintrag.wert === einstellungen.farbe);

  const zeilen: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Imkereiverwaltung//Massnahmen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Imkerei – Maßnahmen",
    "X-WR-CALDESC:Offene Maßnahmen mit Termin aus der Imkereiverwaltung",
    "X-WR-TIMEZONE:Europe/Berlin",
    // Wie oft die Kalender-App nachschauen soll. Sie hält sich nicht
    // zwingend daran, aber es ist der übliche Hinweis.
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
    "X-PUBLISHED-TTL:PT4H",
  ];

  if (farbe?.css && farbe.hex) {
    zeilen.push(`COLOR:${farbe.css}`, `X-APPLE-CALENDAR-COLOR:${farbe.hex}`);
  }

  for (const termin of termineBilden(massnahmen)) {
    const { volk, stand, staende } = volkUndStand(termin);
    const standNamen = [...staende.keys()].sort(namensSortierung.compare);
    const ort =
      standNamen.length === 1
        ? [standNamen[0], termin.massnahmen[0]!.bienenstandOrt].filter(Boolean).join(", ")
        : standNamen.join(", ");
    // Bei einer Sammelmaßnahme stehen alle Völker je Stand in der Notiz.
    const beschreibung =
      termin.massnahmen.length === 1
        ? `${stand} · ${volk}`
        : standNamen
            .map(
              (name) =>
                `${name}: ${staende
                  .get(name)!
                  .map((massnahme) => massnahme.volkName)
                  .sort(namensSortierung.compare)
                  .join(", ")}`
            )
            .join("\n");

    zeilen.push(
      "BEGIN:VEVENT",
      `UID:${termin.uid}`,
      `DTSTAMP:${alsZeitstempel(jetzt)}`,
      // Ganztägiger Termin: der Tag selbst, das Ende ist der Folgetag.
      `DTSTART;VALUE=DATE:${alsDatum(termin.faelligAm)}`,
      `DTEND;VALUE=DATE:${alsDatum(tagSpaeter(termin.faelligAm))}`,
      `SUMMARY:${textMaskieren(
        titelBauen(einstellungen.titelMuster, { massnahme: termin.text, volk, stand })
      )}`,
      `DESCRIPTION:${textMaskieren(beschreibung)}`,
      `LOCATION:${textMaskieren(ort)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT"
    );

    if (farbe?.css) {
      zeilen.push(`COLOR:${farbe.css}`);
    }

    if (erinnerung.ausloeser) {
      zeilen.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `TRIGGER:${erinnerung.ausloeser}`,
        `DESCRIPTION:${textMaskieren(`Fällig: ${termin.text} (${volk})`)}`,
        "END:VALARM"
      );
    }

    zeilen.push("END:VEVENT");
  }

  zeilen.push("END:VCALENDAR");

  return zeilen.map(zeileFalten).join("\r\n") + "\r\n";
}
