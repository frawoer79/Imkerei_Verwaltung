/// Vorlagen für die in Deutschland gängigsten Varroa-Mittel. Eine Vorlage
/// füllt nur die Stammdaten vor (Handelsname, Wirkstoff, Einheit, Wartezeit);
/// die Angaben zur gekauften Packung (Lieferant, Rechnung, Charge, Kaufdatum)
/// muss der Imker beim Aktivieren selbst eintragen.
///
/// Quellen (Stand Oktober 2026):
/// - Emmerich, Berl Münch Tierärztl Wochenschr 2018, "Zugelassene Arzneimittel
///   für Honigbienen in Deutschland" (Wirkstoffe, Anwendungshinweise)
/// - EU-Tierarzneimittel-Datenbank medicines.health.europa.eu (Wartezeit Honig,
///   deutsche Zulassungsnummern)
/// Zulassungsnummern stehen nur dort, wo sie für Deutschland belegt sind.
/// Sonst bleibt das Feld leer und wird von der Packung übernommen.
export type MedikamentVorlage = {
  schluessel: string;
  name: string;
  wirkstoff: string;
  zulassungsnummer?: string;
  einheit: string;
  wartezeitTage: number;
  /// Kurzbeschreibung der Darreichung für die Auswahlliste.
  art: string;
  /// Landet in den Notizen, damit der Hinweis beim Mittel steht.
  hinweis?: string;
};

export const MEDIKAMENT_VORLAGEN: MedikamentVorlage[] = [
  {
    schluessel: "ameisensaeure-60",
    name: "Ameisensäure 60 Bernburg 684 mg/ml",
    wirkstoff: "Ameisensäure",
    zulassungsnummer: "V7006708.00.00",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Lösung zum Verdunsten",
  },
  {
    schluessel: "formivar-85",
    name: "Formivar 85",
    wirkstoff: "Ameisensäure",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Lösung zum Verdunsten",
  },
  {
    schluessel: "formicpro",
    name: "Formicpro 68,2 g",
    wirkstoff: "Ameisensäure",
    einheit: "Streifen",
    wartezeitTage: 0,
    art: "Gelstreifen",
  },
  {
    schluessel: "oxalsaeure-35",
    name: "Oxalsäuredihydrat-Lösung 3,5 % (m/V) ad us. vet.",
    wirkstoff: "Oxalsäure",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Träufellösung",
    hinweis: "Laut Übersicht 2018: Honig erst im darauffolgenden Frühjahr ernten.",
  },
  {
    schluessel: "oxuvar-57",
    name: "Oxuvar 5,7 %",
    wirkstoff: "Oxalsäure",
    zulassungsnummer: "402355.00.00",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Konzentrat zum Träufeln und Sprühen",
    hinweis: "Nur ohne aufgesetzte Honigräume anwenden.",
  },
  {
    schluessel: "api-bioxal",
    name: "Api-Bioxal",
    wirkstoff: "Oxalsäure",
    einheit: "g",
    wartezeitTage: 0,
    art: "Pulver zum Träufeln oder Verdampfen",
    hinweis: "Nicht mit Honigräumen oder während der Tracht anwenden.",
  },
  {
    schluessel: "varroxal",
    name: "Varroxal 0,71 g/g",
    wirkstoff: "Oxalsäure",
    zulassungsnummer: "V7013210.00.00",
    einheit: "g",
    wartezeitTage: 0,
    art: "Pulver zum Verdampfen",
  },
  {
    schluessel: "oxybee",
    name: "Oxybee 39,4 mg/ml",
    wirkstoff: "Oxalsäure",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Pulver und Lösung zum Träufeln",
    hinweis: "EU-weit zugelassen, Zulassungsnummer (EU/2/…) von der Packung übernehmen.",
  },
  {
    schluessel: "varromed",
    name: "VarroMed 5 mg/ml + 44 mg/ml",
    wirkstoff: "Ameisensäure, Oxalsäure",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Dispersion zum Träufeln",
    hinweis: "EU-weit zugelassen, Zulassungsnummer (EU/2/…) von der Packung übernehmen.",
  },
  {
    schluessel: "milchsaeure-15",
    name: "Milchsäure 15 % ad us. vet.",
    wirkstoff: "Milchsäure",
    einheit: "ml",
    wartezeitTage: 0,
    art: "Sprühlösung",
    hinweis: "Laut Übersicht 2018: bei Sommerbehandlung Honig erst im Folgejahr ernten.",
  },
  {
    schluessel: "thymovar",
    name: "Thymovar 15 g",
    wirkstoff: "Thymol",
    einheit: "Streifen",
    wartezeitTage: 0,
    art: "Streifen",
    hinweis: "Nicht vor oder während der Tracht anwenden.",
  },
  {
    schluessel: "apilife-var",
    name: "Apilife Var",
    wirkstoff: "Thymol, Eukalyptusöl, Campher, Levomenthol",
    einheit: "Streifen",
    wartezeitTage: 0,
    art: "Streifen",
    hinweis: "Nicht während der Tracht anwenden.",
  },
  {
    schluessel: "apiguard",
    name: "Apiguard 25 %",
    wirkstoff: "Thymol",
    zulassungsnummer: "400616.00.00",
    einheit: "Stück",
    wartezeitTage: 0,
    art: "Gel in Schalen",
    hinweis: "Nicht während der Tracht anwenden.",
  },
  {
    schluessel: "apivar",
    name: "Apivar 500 mg",
    wirkstoff: "Amitraz",
    zulassungsnummer: "402438.00.00",
    einheit: "Streifen",
    wartezeitTage: 0,
    art: "Streifen",
    hinweis: "Nicht während der Tracht anwenden, erst nach der Honigernte.",
  },
];

export function medikamentVorlage(schluessel: string | undefined | null) {
  if (!schluessel) return undefined;
  return MEDIKAMENT_VORLAGEN.find((vorlage) => vorlage.schluessel === schluessel);
}
