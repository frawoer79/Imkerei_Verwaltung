"use client";

import { useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui";
import { IconWarnung } from "@/components/icons";
import { FormularFehler, SicheresFormular, SpeichernKnopf, type AktionsErgebnis } from "@/components/sicheres-formular";
import { heuteAlsInputWert } from "@/lib/datum";
import { INDIKATIONEN } from "@/lib/behandlung";
import { VoelkerAuswahl, type StandMitVoelkern } from "@/components/voelker-auswahl";

export type MedikamentAuswahl = {
  id: string;
  name: string;
  einheit: string;
  wartezeitTage: number;
  chargennummer: string | null;
  /// Was für einen rechtssicheren Nachweis am Medikament noch fehlt (leer = vollständig).
  fehlt: string[];
};

export type { StandMitVoelkern };

/// Medikamenten-Schritt eines biotechnischen Verfahrens: Völker und Mittel
/// sind vorgewählt, nach dem Speichern ist der Schritt abgehakt.
export type VerfahrenVorauswahl = {
  verfahrenId: string;
  schritt: string;
  volkIds: string[];
  medikamentId?: string;
};

export function BehandlungFormular({
  action,
  medikamente,
  staende,
  anwenderVorschlag,
  vorausgewaehltesVolk,
  verfahren,
}: {
  action: (formData: FormData) => Promise<AktionsErgebnis>;
  medikamente: MedikamentAuswahl[];
  staende: StandMitVoelkern[];
  anwenderVorschlag: string;
  vorausgewaehltesVolk?: string;
  verfahren?: VerfahrenVorauswahl;
}) {
  const startMedikament =
    medikamente.find((eintrag) => eintrag.id === verfahren?.medikamentId) ?? medikamente[0];
  const [medikamentId, setMedikamentId] = useState(startMedikament?.id ?? "");
  const [wartezeit, setWartezeit] = useState(
    (startMedikament?.wartezeitTage ?? 0).toString()
  );
  const [gewaehlt, setGewaehlt] = useState<string[]>(
    verfahren ? verfahren.volkIds : vorausgewaehltesVolk ? [vorausgewaehltesVolk] : []
  );

  const medikament = medikamente.find((eintrag) => eintrag.id === medikamentId);

  function medikamentWechseln(neueId: string) {
    setMedikamentId(neueId);
    const neues = medikamente.find((eintrag) => eintrag.id === neueId);
    if (neues) setWartezeit(neues.wartezeitTage.toString());
  }

  return (
    <SicheresFormular action={action} className="flex flex-col gap-4">
      {/* Vom Volk aus geöffnet: nach dem Speichern dorthin zurück. */}
      {vorausgewaehltesVolk && <input type="hidden" name="zurueckZuVolk" value={vorausgewaehltesVolk} />}
      {verfahren && (
        <>
          <input type="hidden" name="verfahrenId" value={verfahren.verfahrenId} />
          <input type="hidden" name="schritt" value={verfahren.schritt} />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="medikamentId">Medikament</Label>
          <Select
            id="medikamentId"
            name="medikamentId"
            value={medikamentId}
            onChange={(event) => medikamentWechseln(event.target.value)}
            required
          >
            {medikamente.map((eintrag) => (
              <option key={eintrag.id} value={eintrag.id}>
                {eintrag.name}
                {eintrag.chargennummer ? ` (Ch. ${eintrag.chargennummer})` : ""}
              </option>
            ))}
          </Select>
          {medikament && medikament.fehlt.length > 0 && (
            <p className="mt-1 text-xs text-gefahr">
              <IconWarnung className="mr-1 inline-block h-[1em] w-[1em] align-[-0.125em]" />
              Nachweis unvollständig. Am Medikament fehlt: {medikament.fehlt.join(", ")}.{" "}
              <a href={`/medikamente/${medikament.id}/bearbeiten`} className="underline">
                Medikament ergänzen
              </a>
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="indikation">Behandelt gegen</Label>
          <Input
            id="indikation"
            name="indikation"
            list="indikationen"
            defaultValue="Varroose"
            required
          />
          <datalist id="indikationen">
            {INDIKATIONEN.map((indikation) => (
              <option key={indikation} value={indikation} />
            ))}
          </datalist>
        </div>
      </div>

      <VoelkerAuswahl staende={staende} gewaehlt={gewaehlt} setGewaehlt={setGewaehlt} titel="Behandelte Völker" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="datum">Datum der Anwendung</Label>
          <Input
            id="datum"
            name="datum"
            type="date"
            defaultValue={heuteAlsInputWert()}
            required
          />
        </div>
        <div>
          <Label htmlFor="endeDatum">Ende (nur bei Langzeitbehandlung)</Label>
          <Input id="endeDatum" name="endeDatum" type="date" />
          <p className="mt-1 text-xs text-muted">
            z.B. Thymovar oder Ameisensäure im Langzeitverdunster
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="mengeJeVolk">
            Menge je Volk{medikament ? ` (${medikament.einheit})` : ""}
          </Label>
          <Input
            id="mengeJeVolk"
            name="mengeJeVolk"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]+)?"
            title="Zahl, Komma erlaubt, z.B. 2,5"
            required
          />
        </div>
        <div>
          <Label htmlFor="wartezeitTage">Wartezeit (Tage)</Label>
          <Input
            id="wartezeitTage"
            name="wartezeitTage"
            type="number"
            min="0"
            step="1"
            value={wartezeit}
            onChange={(event) => setWartezeit(event.target.value)}
            required
          />
          <p className="mt-1 text-xs text-muted">Pflichtfeld, auch 0 ist eine Angabe.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="anwender">Anwender</Label>
        <Input id="anwender" name="anwender" defaultValue={anwenderVorschlag} required />
      </div>

      <div>
        <Label htmlFor="bemerkung">Bemerkung</Label>
        <Textarea
          id="bemerkung"
          name="bemerkung"
          rows={2}
          placeholder="z.B. Nassenheider professional, Honigräume ab"
        />
      </div>

      <div className="flex flex-col gap-2">
        <FormularFehler />
        <div>
          <SpeichernKnopf>Behandlung eintragen</SpeichernKnopf>
        </div>
        <p className="text-xs text-muted">
          Nach dem Speichern gesperrt. Eine falsche Angabe wird storniert (mit Grund, bleibt
          sichtbar) und neu erfasst. So verlangt es § 1 Abs. 1 THAMNV.
        </p>
      </div>
    </SicheresFormular>
  );
}
