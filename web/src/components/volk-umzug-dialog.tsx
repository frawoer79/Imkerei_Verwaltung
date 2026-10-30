"use client";

import { useRef, useState } from "react";
import { Label, Input, Select } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import type { FormularErgebnis } from "@/lib/actions";
import { jetztAlsInputWert } from "@/lib/datum";
import { IconUmzug } from "@/components/icons";
import { AKTION_KACHEL, AKTION_SYMBOL } from "@/components/volk-aktion-kachel";

// Volk komplett zu einem anderen, bestehenden Bienenstand umziehen lassen.
// Anders als der Standortwechsel im normalen "Volk bearbeiten"-Formular (der
// nebenbei mitläuft) ist das hier ein eigener, bewusster Vorgang: fragt
// gezielt nach dem Ziel und dem Zeitpunkt und hinterlässt dafür einen
// eigenen Stockkarten-Eintrag (siehe volkUmziehen in actions.ts). Die
// restliche Dokumentation (Verlauf, Fotos, Maßnahmen) hängt am Volk, nicht
// am Stand, und bleibt dadurch unverändert erhalten.
export function VolkUmzugDialog({
  bienenstaende,
  action,
}: {
  bienenstaende: { id: string; name: string; standtyp: "FEST" | "WANDER" }[];
  action: (formData: FormData) => Promise<FormularErgebnis>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zeitwahl, setZeitwahl] = useState<"jetzt" | "manuell">("jetzt");

  // Ohne einen zweiten Stand gibt es nichts, wohin umgezogen werden könnte.
  if (bienenstaende.length === 0) return null;

  return (
    <>
      <button type="button" data-schreibt className={AKTION_KACHEL} onClick={() => dialogRef.current?.showModal()}>
        <IconUmzug className={AKTION_SYMBOL} />
        Umziehen
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        {/* Nach dem Umzug bleibt man auf der Volk-Seite (sie lädt neu) - der
            Dialog schließt sich dann. Eine Meldung bleibt im Dialog stehen. */}
        <SicheresFormular
          action={action}
          beiErfolg={() => dialogRef.current?.close()}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Volk umziehen</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-muted">
            Die Stockkarte (Verlauf, Fotos, Maßnahmen) bleibt vollständig erhalten und
            erscheint danach am neuen Stand. Ein neuer Stockkarten-Eintrag vermerkt, von welchem
            Stand und wann umgezogen wurde.
          </p>

          <div>
            <Label htmlFor="zielBienenstandId">Neuer Bienenstand</Label>
            <Select id="zielBienenstandId" name="zielBienenstandId" required defaultValue="">
              <option value="" disabled>
                Bitte wählen …
              </option>
              {bienenstaende.map((stand) => (
                <option key={stand.id} value={stand.id}>
                  {stand.name}
                  {stand.standtyp === "WANDER" ? " (Wanderstand)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-muted">Zeitpunkt des Umzugs</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="zeitwahl"
                value="jetzt"
                checked={zeitwahl === "jetzt"}
                onChange={() => setZeitwahl("jetzt")}
              />
              Jetzt (aktuelles Datum/Uhrzeit)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="zeitwahl"
                value="manuell"
                checked={zeitwahl === "manuell"}
                onChange={() => setZeitwahl("manuell")}
              />
              Datum/Uhrzeit selbst eingeben
            </label>
            {zeitwahl === "manuell" && (
              <Input
                type="datetime-local"
                name="datum"
                defaultValue={jetztAlsInputWert()}
                required
                aria-label="Datum und Uhrzeit des Umzugs"
              />
            )}
          </fieldset>

          <FormularFehler />
          <SpeichernKnopf sendetText="Wird umgezogen …">Umziehen</SpeichernKnopf>
        </SicheresFormular>
      </dialog>
    </>
  );
}
