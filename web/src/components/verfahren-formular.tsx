"use client";

import { useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf, type AktionsErgebnis } from "@/components/sicheres-formular";
import { VoelkerAuswahl, type StandMitVoelkern } from "@/components/voelker-auswahl";
import { heuteAlsInputWert } from "@/lib/datum";
import type { BioVerfahrenArt } from "@/generated/prisma/enums";
import {
  BANNWABE_VARIANTEN,
  BANNWABE_VARIANTE_ERKLAERUNG,
  BANNWABE_VARIANTE_LABEL,
  BIO_VERFAHREN_ARTEN,
  BIO_VERFAHREN_ERKLAERUNG,
  BIO_VERFAHREN_LABEL,
  VERBLEIB_LABEL,
  bannwabeVariante,
  betrifftKoenigin,
  schrittDatum,
  verbleibOptionen,
  verfahrenSchritte,
} from "@/lib/bio-verfahren";

export type VerfahrenWerte = {
  art: BioVerfahrenArt;
  /// "2026-07-13"
  beginn: string;
  bezeichnung: string | null;
  anwender: string;
  bemerkung: string | null;
  brutwaben: number | null;
  verbleib: string | null;
  fangwabe: boolean;
  kaefig: string | null;
  bannwabeVariante: string | null;
  inMassnahmen: boolean;
};

const terminAnzeige = (datum: Date) =>
  new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(datum);

// Biotechnisches Verfahren anlegen oder ändern. Statt Medikament, Menge und
// Wartezeit gibt es je Verfahren eigene Angaben und einen Fahrplan: die
// Folgeschritte werden beim Speichern als Maßnahmen angelegt.
export function VerfahrenFormular({
  action,
  staende = [],
  anwenderVorschlag = "",
  vorausgewaehltesVolk,
  werte,
}: {
  action: (formData: FormData) => Promise<AktionsErgebnis>;
  staende?: StandMitVoelkern[];
  anwenderVorschlag?: string;
  vorausgewaehltesVolk?: string;
  /// Beim Ändern: gespeicherte Werte. Verfahren und Völker stehen dann fest.
  werte?: VerfahrenWerte;
}) {
  const aendern = !!werte;
  const [art, setArt] = useState<BioVerfahrenArt>(werte?.art ?? "TBE");
  const [beginn, setBeginn] = useState(werte?.beginn ?? heuteAlsInputWert());
  const [verbleib, setVerbleib] = useState<string>(werte?.verbleib ?? "");
  const [fangwabe, setFangwabe] = useState(werte?.fangwabe ?? false);
  const [inMassnahmen, setInMassnahmen] = useState(werte?.inMassnahmen ?? false);
  const [variante, setVariante] = useState(bannwabeVariante(werte?.bannwabeVariante));
  const [gewaehlt, setGewaehlt] = useState<string[]>(vorausgewaehltesVolk ? [vorausgewaehltesVolk] : []);

  const optionen = verbleibOptionen(art);
  const verbleibGueltig = optionen.includes(verbleib) ? verbleib : "";
  const schritte = verfahrenSchritte(art, { verbleib: verbleibGueltig, fangwabe, bannwabeVariante: variante });
  const beginnDatum = beginn ? new Date(beginn) : null;
  const heute = heuteAlsInputWert();
  const brutentnahme = art === "TBE" || art === "TEIL_BRUTENTNAHME";

  return (
    <SicheresFormular action={action} className="flex flex-col gap-4">
      {vorausgewaehltesVolk && <input type="hidden" name="zurueckZuVolk" value={vorausgewaehltesVolk} />}

      {aendern ? (
        <p className="font-medium">{BIO_VERFAHREN_LABEL[art]}</p>
      ) : (
        <div>
          <Label htmlFor="art">Verfahren</Label>
          <Select id="art" name="art" value={art} onChange={(event) => setArt(event.target.value as BioVerfahrenArt)}>
            {BIO_VERFAHREN_ARTEN.map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {BIO_VERFAHREN_LABEL[eintrag]}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">{BIO_VERFAHREN_ERKLAERUNG[art]}</p>
        </div>
      )}

      {art === "BANNWABE" && (
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-muted">Ablauf</legend>
          <div className="flex flex-wrap gap-2">
            {BANNWABE_VARIANTEN.map((option) => (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm ${
                  variante === option
                    ? "border-accent bg-accent font-medium text-accent-foreground"
                    : "border-rand-ruhig bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="bannwabeVariante"
                  value={option}
                  checked={variante === option}
                  onChange={() => setVariante(option)}
                  className="sr-only"
                />
                {BANNWABE_VARIANTE_LABEL[option]}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{BANNWABE_VARIANTE_ERKLAERUNG[variante]}</p>
        </fieldset>
      )}

      {art === "SONSTIGES" && (
        <div>
          <Label htmlFor="bezeichnung">Was hast du gemacht?</Label>
          <Input
            id="bezeichnung"
            name="bezeichnung"
            defaultValue={werte?.bezeichnung ?? ""}
            placeholder="z.B. Kunstschwarm gebildet"
            required
          />
        </div>
      )}

      {!aendern && (
        <VoelkerAuswahl staende={staende} gewaehlt={gewaehlt} setGewaehlt={setGewaehlt} titel="Völker" />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="beginn">{art === "SONSTIGES" ? "Datum" : "Beginn"}</Label>
          <Input
            id="beginn"
            name="beginn"
            type="date"
            value={beginn}
            onChange={(event) => setBeginn(event.target.value)}
            required
          />
        </div>
        {brutentnahme && (
          <div>
            <Label htmlFor="brutwaben">Brutwaben je Volk</Label>
            <Input
              id="brutwaben"
              name="brutwaben"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              defaultValue={werte?.brutwaben ?? ""}
            />
          </div>
        )}
        {betrifftKoenigin(art) && (
          <div>
            <Label htmlFor="kaefig">{art === "BANNWABE" ? "Wabentasche / Käfig" : "Käfig"}</Label>
            <Input
              id="kaefig"
              name="kaefig"
              defaultValue={werte?.kaefig ?? ""}
              placeholder={art === "BANNWABE" ? "z.B. Wabentasche" : "z.B. Scalvini"}
            />
          </div>
        )}
      </div>

      {optionen.length > 0 && (
        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-muted">Verbleib der Brutwaben</legend>
          <div className="flex flex-wrap gap-2">
            {optionen.map((option) => (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm ${
                  verbleibGueltig === option
                    ? "border-accent bg-accent font-medium text-accent-foreground"
                    : "border-rand-ruhig bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="verbleib"
                  value={option}
                  checked={verbleibGueltig === option}
                  onChange={() => setVerbleib(option)}
                  className="sr-only"
                />
                {VERBLEIB_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {art === "TBE" && (
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-rand-ruhig bg-card px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="fangwabe"
            value="ja"
            checked={fangwabe}
            onChange={(event) => setFangwabe(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
          />
          <span>
            Fangwabe im Volk gelassen
            <span className="block text-xs text-muted">
              Eine offene Brutwabe bleibt drin und kommt nach etwa 9 Tagen raus. Dann geht es ohne Oxalsäure.
            </span>
          </span>
        </label>
      )}

      {schritte.length > 1 && (
        <div>
          <p className="block text-sm font-medium text-muted">Fahrplan</p>
          <p className="mb-2 text-xs text-muted">
            {aendern ? "Offene Schritte bekommen beim Speichern den neuen Termin. " : ""}
            Abhaken kannst du jeden Schritt auf der Seite des Verfahrens.
          </p>
          <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-md border border-rand-ruhig bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="inMassnahmen"
              value="ja"
              checked={inMassnahmen}
              onChange={(event) => setInMassnahmen(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
            />
            <span>
              In Maßnahmen übernehmen
              <span className="block text-xs text-muted">
                {inMassnahmen
                  ? "Das Verfahren steht dort als eine Zeile mit dem nächsten Schritt. Die Termine kommen auch in den Kalender und ins Kalender-Abo."
                  : "Aus: Die Schritte stehen nur beim Verfahren und im Verlauf am Volk. Nicht in der Maßnahmen-Liste, nicht im Kalender."}
              </span>
            </span>
          </label>
          <ol className="overflow-hidden rounded-md border border-border bg-card">
            {!aendern && (
              <li className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-3 border-b border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted">
                <span>Tag</span>
                <span>Schritt</span>
                <span className="justify-self-center">Erledigt</span>
              </li>
            )}
            {schritte.map((schritt) => {
              const termin = beginnDatum ? schrittDatum(beginnDatum, schritt.tag) : null;
              const vorbei = !!termin && termin.toISOString().slice(0, 10) < heute;
              return (
                <li
                  key={`${art}-${schritt.schluessel}-${beginn}`}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span className="text-xs font-semibold uppercase text-muted">Tag {schritt.tag}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {schritt.titel}
                      {schritt.medikament && (
                        <span className="ml-1.5 whitespace-nowrap rounded-full border border-warnung-rand bg-warnung-flaeche px-1.5 py-0.5 align-[1px] text-[11px] font-semibold text-warnung">
                          Medikament
                        </span>
                      )}
                    </span>
                    {termin && <span className="block text-xs">{terminAnzeige(termin)}</span>}
                    {schritt.hinweis && <span className="block text-xs text-muted">{schritt.hinweis}</span>}
                  </span>
                  {/* Beim Anlegen: was schon getan ist, gleich abhaken. Der
                      Medikamenten-Schritt wird über die Behandlung erledigt. */}
                  {!aendern && !schritt.medikament ? (
                    <input
                      type="checkbox"
                      name="erledigt"
                      value={schritt.schluessel}
                      defaultChecked={schritt.tag === 0 || vorbei}
                      aria-label={`${schritt.titel} schon erledigt`}
                      className="h-6 w-6 cursor-pointer justify-self-center accent-accent"
                    />
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ol>
          {!aendern && (
            <p className="mt-1 text-xs text-muted">
              Hast du einen Schritt schon gemacht, setz den Haken. Dann ist er gleich erledigt.
              {schritte.some((schritt) => schritt.medikament) &&
                " Den Medikamenten-Schritt erledigst du über „Behandlung eintragen“. Dann steht er im Bestandsbuch."}
            </p>
          )}
        </div>
      )}

      {!aendern && betrifftKoenigin(art) && (
        <p className="text-xs text-muted">Steht danach auch im Lebenslauf der Königin.</p>
      )}

      <div>
        <Label htmlFor="anwender">Anwender</Label>
        <Input id="anwender" name="anwender" defaultValue={werte?.anwender ?? anwenderVorschlag} required />
      </div>

      <div>
        <Label htmlFor="bemerkung">Bemerkung</Label>
        <Textarea
          id="bemerkung"
          name="bemerkung"
          rows={2}
          defaultValue={werte?.bemerkung ?? ""}
          placeholder="z.B. Milben in der Fangwabe gezählt"
        />
      </div>

      <div className="flex flex-col gap-2">
        <FormularFehler />
        <div>
          <SpeichernKnopf>{aendern ? "Speichern" : art === "SONSTIGES" ? "Eintragen" : "Verfahren starten"}</SpeichernKnopf>
        </div>
        <p className="text-xs text-muted">
          Ohne Medikament: kein Eintrag im Bestandsbuch. Du kannst das Verfahren später ändern oder löschen.
        </p>
      </div>
    </SicheresFormular>
  );
}
