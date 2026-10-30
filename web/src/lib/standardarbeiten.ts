// Wiederkehrende Arbeiten am Volk, damit eine Maßnahme meist nur ausgewählt
// statt getippt werden muss. Bewusst als einfache Liste im Quelltext: sie
// ändert sich selten, und so braucht es keine eigene Verwaltungsseite dafür.
// Gruppiert, damit die Auswahl auch bei vielen Einträgen übersichtlich bleibt
// (auf dem iPhone wird daraus das native Auswahlrad).

export type Arbeitsgruppe = {
  titel: string;
  arbeiten: string[];
};

export const STANDARDARBEITEN: Arbeitsgruppe[] = [
  {
    titel: "Durchsicht und Kontrolle",
    arbeiten: [
      "Schwarmkontrolle",
      "Weiselprobe",
      "Futterkontrolle",
      "Brutnest kontrollieren",
      "Königin suchen",
    ],
  },
  {
    titel: "Varroa",
    arbeiten: [
      "Bodeneinlage für Gemülldiagnose einschieben",
      "Bodeneinlage auswerten",
      "Bienenprobe für Befallskontrolle nehmen",
      "Varroabehandlung durchführen",
      "Behandlungserfolg kontrollieren",
      "Restentmilbung im brutfreien Volk",
    ],
  },
  {
    titel: "Waben und Brutraum",
    arbeiten: [
      "Drohnenbrut schneiden",
      "Baurahmen geben",
      "Mittelwände einhängen",
      "Altwaben ausscheiden",
      "Brutraum erweitern",
      "Brutraum einengen",
    ],
  },
  {
    titel: "Honig",
    arbeiten: [
      "Honigraum aufsetzen",
      "Absperrgitter einlegen",
      "Bienenflucht einlegen",
      "Honigräume abnehmen",
      "Abschleudern",
      "Wassergehalt messen",
    ],
  },
  {
    titel: "Vermehrung und Königin",
    arbeiten: [
      "Ableger bilden",
      "Königin markieren",
      "Königin zusetzen",
      "Weiselzellen brechen",
      "Begattungserfolg prüfen",
    ],
  },
  {
    titel: "Ein- und Auswintern",
    arbeiten: [
      "Auffüttern",
      "Futtervorrat wiegen",
      "Mäusegitter anbringen",
      "Fluglochkeil einsetzen",
      "Beute reinigen",
      "Totenfall entfernen",
      "Auswinterungskontrolle",
    ],
  },
];
