"use client";

import { useState } from "react";
import { massnahmeLoeschen } from "@/lib/actions";
import { Button } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import { MassnahmeBearbeitenFormular } from "@/components/massnahme-bearbeiten-formular";
import { IconBearbeiten, IconMuelleimer } from "@/components/icons";
import { FAELLIGKEIT_TEXT, faelligkeitBestimmen, faelligkeitText } from "@/lib/faelligkeit";

function datumAnzeige(datum: Date): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(datum);
}

// Lose Maßnahme als Karte im Verlauf der Volk-Seite. Nur erwähnt, ohne Haken:
// abgehakt wird oben in "Offene Maßnahmen" (Franks Wunsch). Bearbeiten und
// Löschen bleiben als Symbol-Knöpfe, weil es für lose Maßnahmen sonst nur die
// Maßnahmen-Seite gäbe. Gleiche Schreibweise wie die Maßnahmen an einer
// Durchsicht: ○ offen, ✓ erledigt.
export function MassnahmeImVerlauf({
  massnahme,
  datum,
  heute,
  von,
}: {
  massnahme: { id: string; text: string; faelligAm: Date | null; erledigt: boolean };
  datum: string;
  heute: Date;
  /// Wer sie angelegt hat (Historie), nur wenn es Helfer gibt.
  von?: string;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const faelligkeit = massnahme.erledigt ? "ohne" : faelligkeitBestimmen(massnahme.faelligAm, heute);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="pt-1.5">
          <p className="whitespace-nowrap font-semibold">{datum}</p>
          {von && <p className="text-xs text-muted">von {von}</p>}
        </div>
        <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
          {/* Am Handy reicht der graue Streifen links, sonst bricht das Datum um. */}
          <span className="mr-1 hidden rounded-full bg-background px-2 py-0.5 text-xs text-muted sm:inline">Maßnahme</span>
          {!bearbeiten && (
            <>
              <Button data-schreibt
                type="button"
                variant="leise"
                groesse="symbol"
                onClick={() => setBearbeiten(true)}
                aria-label="Maßnahme bearbeiten"
                title="Bearbeiten"
              >
                <IconBearbeiten className="h-5 w-5" />
              </Button>
              <LoeschenButton
                action={massnahmeLoeschen.bind(null, massnahme.id)}
                bestaetigung="Diese Maßnahme wirklich löschen?"
                variant="leiseGefahr"
                groesse="symbol"
                label="Löschen"
              >
                <IconMuelleimer className="h-5 w-5" />
              </LoeschenButton>
            </>
          )}
        </div>
      </div>
      {bearbeiten ? (
        <div className="mt-3">
          <MassnahmeBearbeitenFormular massnahme={massnahme} fertig={() => setBearbeiten(false)} />
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <p className={massnahme.erledigt ? "text-muted line-through" : "font-medium"}>
            {massnahme.erledigt ? "✓ " : "○ "}
            {massnahme.text}
          </p>
          <p className={`mt-0.5 text-xs ${massnahme.erledigt ? "text-muted" : FAELLIGKEIT_TEXT[faelligkeit]}`}>
            {massnahme.erledigt
              ? "Erledigt"
              : massnahme.faelligAm
                ? `Offen · ${faelligkeitText(faelligkeit, datumAnzeige(massnahme.faelligAm))}`
                : "Offen"}
          </p>
        </div>
      )}
    </>
  );
}
