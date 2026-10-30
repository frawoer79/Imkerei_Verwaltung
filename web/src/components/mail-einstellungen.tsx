"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { LoeschenButton } from "@/components/loeschen-button";
import type { MailErgebnis } from "@/lib/mail-actions";

export type GespeicherteMailEinstellung = {
  host: string;
  port: number;
  benutzer: string | null;
  absender: string;
  passwortGespeichert: boolean;
  passwortLesbar: boolean;
  getestetAm: string | null;
};

// Abschnitt "E-Mail" unter Einstellungen: Zugang zum Postausgangsserver des
// eigenen Mailanbieters. "Speichern und Testmail senden" speichert und prüft
// in einem Schritt; erst nach erfolgreicher Testmail erscheint unter
// Dokumente der Knopf zum Versenden. Das Passwort wird nach dem Speichern nie
// wieder angezeigt - ein leeres Feld behält das gespeicherte.
export function MailEinstellungen({
  gespeichert,
  speichern,
  entfernen,
}: {
  gespeichert: GespeicherteMailEinstellung | null;
  speichern: (formData: FormData) => Promise<MailErgebnis>;
  entfernen: () => Promise<void>;
}) {
  const [ergebnis, setErgebnis] = useState<MailErgebnis | null>(null);
  const [sendetGerade, setSendetGerade] = useState(false);

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formular = event.currentTarget;
    setSendetGerade(true);
    setErgebnis(null);
    try {
      const antwort = await speichern(new FormData(formular));
      setErgebnis(antwort);
      const passwortFeld = formular.elements.namedItem("passwort");
      if (passwortFeld instanceof HTMLInputElement) passwortFeld.value = "";
    } catch {
      setErgebnis({ ok: false, meldung: "Keine Verbindung zum Server. Bitte noch einmal versuchen." });
    } finally {
      setSendetGerade(false);
    }
  }

  const status = !gespeichert
    ? { text: "Nicht eingerichtet. Unter Dokumente gibt es deshalb keinen E-Mail-Knopf.", farbe: "text-muted" }
    : !gespeichert.passwortLesbar
      ? { text: "Das gespeicherte Passwort ist nicht mehr lesbar. Bitte neu eingeben.", farbe: "text-gefahr" }
      : gespeichert.getestetAm
        ? { text: `Eingerichtet, Testmail erfolgreich am ${gespeichert.getestetAm}.`, farbe: "text-ok" }
        : { text: "Gespeichert, aber noch ohne erfolgreiche Testmail. Der Versand ist deshalb aus.", farbe: "text-warnung" };

  return (
    <div className="flex flex-col gap-4">
      <p className={`text-sm font-medium ${status.farbe}`}>{status.text}</p>

      <form id="mail-einstellungen" onSubmit={absenden} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div>
            <Label htmlFor="mail-host">Postausgangsserver (SMTP)</Label>
            <Input
              id="mail-host"
              name="host"
              defaultValue={gespeichert?.host ?? ""}
              placeholder="z.B. mail.gmx.net"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="mail-port">Port</Label>
            <Input id="mail-port" name="port" type="number" inputMode="numeric" defaultValue={gespeichert?.port ?? 587} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="mail-benutzer">Benutzername</Label>
            <Input
              id="mail-benutzer"
              name="benutzer"
              defaultValue={gespeichert?.benutzer ?? ""}
              placeholder="meist die E-Mail-Adresse"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="mail-passwort">Passwort</Label>
            <Input
              id="mail-passwort"
              name="passwort"
              type="password"
              autoComplete="new-password"
              placeholder={gespeichert?.passwortGespeichert ? "gespeichert, leer lassen zum Behalten" : ""}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="mail-absender">Absenderadresse</Label>
          <Input
            id="mail-absender"
            name="absender"
            type="email"
            inputMode="email"
            defaultValue={gespeichert?.absender ?? ""}
            placeholder="die Adresse dieses Postfachs"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="mt-1 text-xs text-muted">
            Die meisten Anbieter erlauben nur die eigene Adresse. Antworten und „Kopie an mich“
            gehen an die E-Mail-Adresse oben beim Bienenhalter.
          </p>
        </div>

        {ergebnis && (
          <p
            className={`rounded-md border px-3 py-2 text-sm ${
              ergebnis.ok
                ? "border-ok-rand bg-ok-flaeche text-ok"
                : "border-gefahr-rand bg-gefahr-flaeche text-gefahr"
            }`}
          >
            {ergebnis.meldung}
          </p>
        )}
      </form>

      {/* Außerhalb des Formulars, weil "Versand abschalten" ein eigenes
          Formular ist - der Speichern-Knopf hängt über form="..." am obigen. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" form="mail-einstellungen" disabled={sendetGerade}>
          {sendetGerade ? "Testmail wird gesendet …" : "Speichern und Testmail senden"}
        </Button>
        {gespeichert && (
          <LoeschenButton action={entfernen} bestaetigung="E-Mail-Versand abschalten und Zugangsdaten löschen?">
            Versand abschalten
          </LoeschenButton>
        )}
      </div>
    </div>
  );
}
