"use client";

import { useRef, useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { IconBrief } from "@/components/icons";
import { dokumenteVersenden, type MailErgebnis } from "@/lib/mail-actions";
import { dateigroesseAnzeige, type DokumentTyp } from "@/lib/dokumente-typen";

export type MailVersandEinstellungen = {
  maxBytes: number;
  letzteEmpfaenger: string[];
  /// Die eigene Adresse aus den Einstellungen - für "Kopie an mich".
  eigeneAdresse: string | null;
  absenderName: string | null;
};

export type MailAuswahl = { typ: DokumentTyp; id: string; titel: string; groesse?: number };

// Knopf "Per E-Mail senden" über der Dokumentenliste samt Dialog: Empfänger
// (zuletzt benutzte zum Antippen), Betreff und kurzer Text. Die Dateien hängt
// der Server selbst an (siehe lib/mail-actions.ts), hier geht nur die Auswahl
// raus.
export function DokumenteMailDialog({
  auswahl,
  einstellungen,
  onVersendet,
}: {
  auswahl: MailAuswahl[];
  einstellungen: MailVersandEinstellungen;
  onVersendet: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [an, setAn] = useState("");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [kopie, setKopie] = useState(true);
  const [sendetGerade, setSendetGerade] = useState(false);
  const [ergebnis, setErgebnis] = useState<MailErgebnis | null>(null);
  const [letzte, setLetzte] = useState(einstellungen.letzteEmpfaenger);

  // Größe der Auswahl, soweit bekannt (bei Zuchtkarten erst beim Erzeugen) -
  // reicht, um eine offensichtlich zu große Auswahl gleich hier abzufangen.
  // Die verbindliche Prüfung macht der Server mit den echten Dateien.
  const bekannteGroesse = auswahl.reduce((summe, eintrag) => summe + (eintrag.groesse ?? 0), 0);
  const zuGross = bekannteGroesse > einstellungen.maxBytes;

  function oeffnen() {
    setErgebnis(null);
    setBetreff(auswahl.length === 1 ? auswahl[0].titel : `Unterlagen (${auswahl.length} Dokumente)`);
    setText(
      `Hallo,\n\nanbei ${auswahl.length === 1 ? "das Dokument" : "die Dokumente"}.\n\nViele Grüße\n${einstellungen.absenderName ?? ""}`.trimEnd(),
    );
    dialogRef.current?.showModal();
  }

  function schliessen() {
    dialogRef.current?.close();
    if (ergebnis?.ok) {
      setErgebnis(null);
      onVersendet();
    }
  }

  function empfaengerAntippen(adresse: string) {
    const vorhanden = an.split(/[,;\s]+/).filter(Boolean);
    if (vorhanden.includes(adresse)) return;
    setAn([...vorhanden, adresse].join(", "));
  }

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendetGerade(true);
    setErgebnis(null);
    try {
      const formData = new FormData();
      formData.set("auswahl", JSON.stringify(auswahl.map(({ typ, id }) => ({ typ, id }))));
      formData.set("an", an);
      formData.set("betreff", betreff);
      formData.set("text", text);
      if (kopie && einstellungen.eigeneAdresse) formData.set("kopie", "on");
      const antwort = await dokumenteVersenden(formData);
      setErgebnis(antwort);
      if (antwort.ok) {
        const neu = an.split(/[,;\s]+/).filter(Boolean);
        setLetzte([...neu, ...letzte.filter((adresse) => !neu.includes(adresse))].slice(0, 8));
        setAn("");
      }
    } catch {
      setErgebnis({ ok: false, meldung: "Keine Verbindung zum Server. Bitte noch einmal versuchen." });
    } finally {
      setSendetGerade(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={oeffnen} disabled={auswahl.length === 0} className="gap-2">
        <IconBrief className="h-4 w-4" />
        Per E-Mail senden{auswahl.length > 0 && ` (${auswahl.length})`}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={() => ergebnis?.ok && schliessen()}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Per E-Mail senden</h2>
            <button type="button" onClick={schliessen} aria-label="Schließen" className="text-muted hover:text-accent">
              ✕
            </button>
          </div>

          {ergebnis?.ok ? (
            <>
              <p className="rounded-md border border-ok-rand bg-ok-flaeche px-3 py-2 text-sm text-ok">
                {ergebnis.meldung}
              </p>
              <Button type="button" onClick={schliessen}>
                Fertig
              </Button>
            </>
          ) : (
            <form onSubmit={absenden} noValidate className="flex flex-col gap-4">
              <div className="rounded-md bg-background px-3 py-2 text-sm">
                <p className="font-medium">
                  {auswahl.length} {auswahl.length === 1 ? "Anhang" : "Anhänge"}
                  {bekannteGroesse > 0 && <span className="font-normal text-muted"> · {dateigroesseAnzeige(bekannteGroesse)}</span>}
                </p>
                <ul className="mt-1 max-h-24 overflow-y-auto text-xs text-muted">
                  {auswahl.map((eintrag) => (
                    <li key={`${eintrag.typ}-${eintrag.id}`} className="truncate">
                      {eintrag.titel}
                    </li>
                  ))}
                </ul>
              </div>

              {zuGross && (
                <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
                  Die Auswahl ist mit {dateigroesseAnzeige(bekannteGroesse)} zu groß für eine E-Mail
                  (höchstens {dateigroesseAnzeige(einstellungen.maxBytes)}). Bitte weniger Dokumente
                  ankreuzen und auf mehrere Mails aufteilen.
                </p>
              )}

              <div>
                <Label htmlFor="mail-an">An</Label>
                <Input
                  id="mail-an"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  multiple
                  placeholder="name@beispiel.de"
                  value={an}
                  onChange={(ereignis) => setAn(ereignis.target.value)}
                />
                {letzte.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted">Zuletzt:</span>
                    {letzte.map((adresse) => (
                      <button
                        key={adresse}
                        type="button"
                        onClick={() => empfaengerAntippen(adresse)}
                        className="max-w-full truncate rounded-full bg-background px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                      >
                        {adresse}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="mail-betreff">Betreff</Label>
                <Input id="mail-betreff" value={betreff} onChange={(ereignis) => setBetreff(ereignis.target.value)} />
              </div>

              <div>
                <Label htmlFor="mail-text">Text</Label>
                <Textarea id="mail-text" rows={5} value={text} onChange={(ereignis) => setText(ereignis.target.value)} />
              </div>

              {einstellungen.eigeneAdresse && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={kopie}
                    onChange={(ereignis) => setKopie(ereignis.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Kopie an mich ({einstellungen.eigeneAdresse})
                </label>
              )}

              {ergebnis && !ergebnis.ok && (
                <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
                  {ergebnis.meldung}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={schliessen}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={sendetGerade || zuGross || auswahl.length === 0}>
                  {sendetGerade ? "Wird gesendet …" : "Senden"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
