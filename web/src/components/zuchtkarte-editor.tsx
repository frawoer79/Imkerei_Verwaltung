"use client";

import { useState } from "react";
import { Button, LinkKnopf } from "@/components/ui";
import { ZuchtkarteKarte } from "@/components/zuchtkarte-karte";
import type { KartenFeld, ZuchtkarteInhalt } from "@/lib/zuchtkarte-inhalt";

const FORMULAR_ID = "zuchtkarte-formular";

// Die Zuchtkarte als Voransicht, in der jedes Feld direkt auf der Karte
// änderbar ist. Beim Erstellen ist alles schon aus den Daten der Königin
// eingetragen. Gespeichert wird erst mit dem Knopf; die Daten der Königin
// ändern sich dadurch nie, nur die Karte.
//
// Das Formular umfasst nur die Karte (deren Felder heißen wie ihre
// Schlüssel), die Knöpfe daneben gehören per `form`-Attribut dazu - so kann
// das Entfernen (ein eigenes Formular) daneben stehen, ohne zu verschachteln.
export function ZuchtkarteEditor({
  startInhalt,
  vorschlag,
  bestehend,
  stand,
  speichernAction,
  abbrechenHref,
  entfernenSlot,
}: {
  startInhalt: ZuchtkarteInhalt;
  /// Frisch aus den Daten der Königin abgeleitet - Quelle für "neu übernehmen".
  vorschlag: ZuchtkarteInhalt;
  /// Gibt es die Karte schon? Dann lässt sich die Bewertung neu übernehmen.
  bestehend: boolean;
  stand: string;
  speichernAction: (formData: FormData) => void | Promise<void>;
  abbrechenHref: string;
  entfernenSlot?: React.ReactNode;
}) {
  const [inhalt, setInhalt] = useState(startInhalt);
  const [ueberlauf, setUeberlauf] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);

  function feldAendern(feld: KartenFeld, wert: string) {
    setHinweis(null);
    setInhalt((alt) => ({ ...alt, [feld]: wert }));
  }

  function bewertungUebernehmen() {
    setInhalt((alt) => ({
      ...alt,
      beurteilung: vorschlag.beurteilung,
      beurteilungKontext: vorschlag.beurteilungKontext,
    }));
    setHinweis(
      vorschlag.beurteilung || vorschlag.beurteilungKontext
        ? "Bewertung aus den aktuellen Daten der Königin eingetragen. Mit „Zuchtkarte speichern“ behalten."
        : "Zu dieser Königin gibt es noch keine Bewertung. Die Beurteilung auf der Karte ist jetzt leer."
    );
  }

  function allesNeuUebernehmen() {
    // Die Bemerkung gibt es nur auf der Karte, nicht in den Daten der
    // Königin - sie bleibt, wie sie ist.
    setInhalt((alt) => ({ ...vorschlag, bemerkung: alt.bemerkung }));
    setHinweis("Alle Angaben neu aus den Daten der Königin eingetragen, die Bemerkung bleibt. Noch nicht gespeichert.");
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <form id={FORMULAR_ID} action={speichernAction} className="w-full max-w-[26rem] shrink-0 md:w-[26rem]">
        <ZuchtkarteKarte
          inhalt={inhalt}
          stand={stand}
          aendern={feldAendern}
          onUeberlauf={setUeberlauf}
          maxBreitePx={416}
        />
      </form>

      <div className="flex w-full max-w-[26rem] flex-col gap-4 md:sticky md:top-6 md:min-w-0 md:max-w-80 md:flex-1">
        {ueberlauf && (
          <p
            role="alert"
            className="rounded-md border border-gefahr-rand bg-gefahr-flaeche p-3 text-sm text-gefahr"
          >
            Die Karte ist zu voll: Der untere Teil würde beim Drucken abgeschnitten. Bitte einzelne Texte
            kürzen.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" form={FORMULAR_ID}>
            Zuchtkarte speichern
          </Button>
          <LinkKnopf href={abbrechenHref} variant="secondary">Abbrechen</LinkKnopf>
        </div>

        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
          <li>Jedes Feld lässt sich direkt auf der Karte ändern. Das betrifft nur diese Karte, nicht die Daten der Königin.</li>
          <li>Leere Zeilen werden nicht gedruckt.</li>
          <li>Sonderzeichen wie Emojis kann die gedruckte Karte nicht darstellen, sie werden weggelassen.</li>
        </ul>

        {bestehend && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Hat sich an der Königin etwas geändert?</p>
            <Button type="button" variant="secondary" onClick={bewertungUebernehmen}>
              Bewertung neu übernehmen
            </Button>
            <Button type="button" variant="secondary" onClick={allesNeuUebernehmen}>
              Alle Angaben neu übernehmen
            </Button>
            {hinweis && (
              <p role="status" className="text-sm text-muted">
                {hinweis}
              </p>
            )}
          </div>
        )}

        {entfernenSlot && <div className="border-t border-border pt-4">{entfernenSlot}</div>}
      </div>
    </div>
  );
}
