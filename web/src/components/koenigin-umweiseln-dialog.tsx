"use client";

import { useRef, useState } from "react";
import { Input, Label, Select, knopfKlassen } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import { KoeniginSchnellangaben } from "@/components/koenigin-schnellangaben";
import { IconKrone } from "@/components/icons";
import type { FormularErgebnis } from "@/lib/actions";
import { heuteAlsInputWert } from "@/lib/datum";
import { HERKUENFTE, HERKUNFT_LABEL, UMWEISEL_VERBLEIB, UMWEISEL_VERBLEIBE } from "@/lib/koeniginnen";

// Umweiseln von der Volk-Seite aus (Tester-Rückmeldung 2026-10-21): bisher
// ging das nur über den Lebenslauf der neuen Königin, und wer stattdessen die
// Schnellfelder unter "Volk bearbeiten" änderte, überschrieb die alte. Das
// Popup fragt nach der neuen Königin (vorhandene oder neu erfasst) und danach,
// was aus der alten wurde - beides landet im Lebenslauf und im Verlauf.
export function KoeniginUmweiselnDialog({
  alteKennung,
  verfuegbare,
  action,
}: {
  alteKennung: string;
  /// Königinnen in Reserve oder in einem anderen Volk, mit kurzer Beschreibung.
  verfuegbare: { id: string; text: string }[];
  action: (formData: FormData) => Promise<FormularErgebnis>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quelle, setQuelle] = useState<"bestand" | "neu">(verfuegbare.length > 0 ? "bestand" : "neu");
  // Nach dem Speichern frisch beginnen, sonst stünde beim nächsten Öffnen
  // noch die alte Auswahl drin.
  const [runde, setRunde] = useState(0);

  return (
    <>
      <button
        type="button"
        data-schreibt
        className={`${knopfKlassen("secondary", "mittel")} shrink-0 gap-1.5`}
        onClick={() => dialogRef.current?.showModal()}
      >
        <IconKrone className="h-4 w-4" />
        Umweiseln
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <SicheresFormular
          key={runde}
          action={action}
          beiErfolg={() => {
            dialogRef.current?.close();
            setRunde((wert) => wert + 1);
          }}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Umweiseln</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          <div>
            <Label htmlFor="umweiseln-datum">Datum</Label>
            <Input id="umweiseln-datum" type="date" name="datum" defaultValue={heuteAlsInputWert()} required />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Neue Königin</legend>
            {verfuegbare.length === 0 && <input type="hidden" name="quelle" value="neu" />}
            {verfuegbare.length > 0 && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-border p-1">
                {[
                  { wert: "bestand" as const, text: "Aus meinen Königinnen" },
                  { wert: "neu" as const, text: "Neu erfassen" },
                ].map((eintrag) => (
                  <label key={eintrag.wert} className="cursor-pointer">
                    <input
                      type="radio"
                      name="quelle"
                      value={eintrag.wert}
                      checked={quelle === eintrag.wert}
                      onChange={() => setQuelle(eintrag.wert)}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-medium text-muted peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                      {eintrag.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {quelle === "bestand" ? (
              <div>
                <Label htmlFor="umweiseln-koenigin">Königin</Label>
                <Select id="umweiseln-koenigin" name="koeniginId" required defaultValue="">
                  <option value="" disabled>
                    Bitte wählen …
                  </option>
                  {verfuegbare.map((koenigin) => (
                    <option key={koenigin.id} value={koenigin.id}>
                      {koenigin.text}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted">
                  Zur Wahl stehen Königinnen in Reserve und aus anderen Völkern. Sitzt sie in einem anderen
                  Volk, ist das danach ohne Königin.
                </p>
              </div>
            ) : (
              <>
                <KoeniginSchnellangaben idPraefix="umweiseln-" mitVorschau />
                <div>
                  <Label htmlFor="umweiseln-herkunft">Herkunft</Label>
                  <Select id="umweiseln-herkunft" name="herkunft" defaultValue="UNBEKANNT">
                    {HERKUENFTE.map((herkunft) => (
                      <option key={herkunft} value={herkunft}>
                        {HERKUNFT_LABEL[herkunft]}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Was ist mit {alteKennung}?</legend>
            <div className="flex flex-wrap gap-2">
              {UMWEISEL_VERBLEIBE.map((verbleib) => (
                <label key={verbleib} className="cursor-pointer">
                  <input type="radio" name="verbleib" value={verbleib} required className="peer sr-only" />
                  <span className="inline-flex min-h-10 items-center rounded-full border border-rand-bedienung bg-card px-3.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1">
                    {UMWEISEL_VERBLEIB[verbleib].label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              „Verschwunden“ passt bei stiller Umweiselung oder wenn sie nicht mehr da ist.
            </p>
          </fieldset>

          <div>
            <Label htmlFor="umweiseln-notiz">Notiz</Label>
            <Input id="umweiseln-notiz" name="notiz" placeholder="z. B. im Käfig zugesetzt" />
          </div>

          <p className="text-xs text-muted">Steht danach im Verlauf des Volks und im Lebenslauf beider Königinnen.</p>

          <FormularFehler />
          <SpeichernKnopf sendetText="Wird umgeweiselt …">Umweiseln</SpeichernKnopf>
        </SicheresFormular>
      </dialog>
    </>
  );
}
