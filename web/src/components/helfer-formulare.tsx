"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  eigenesPasswortAendern,
  helferAnlegen,
  helferEmailSpeichern,
  helferPasswortZuruecksetzen,
  helferZugangsMailSenden,
  type HelferEmailState,
  type HelferFormularState,
  type PasswortAendernState,
} from "@/lib/nutzer-actions";

function Fehler({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">{text}</p>
  );
}

// Zeigt Name und Startpasswort nach dem Speichern, damit der Admin beides
// weitergeben kann. Danach sieht er das Passwort nie wieder.
function Zugangsdaten({ erfolg, text }: { erfolg: NonNullable<HelferFormularState["erfolg"]>; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-ok-rand bg-ok-flaeche px-3 py-2 text-sm text-ok">
        <p className="font-medium">{text}</p>
        <p className="mt-1">
          Benutzername: <span className="font-mono">{erfolg.name}</span>
          <br />
          Startpasswort: <span className="font-mono">{erfolg.passwort}</span>
        </p>
        {erfolg.mail && !erfolg.mail.fehler && <p className="mt-1">Mail an {erfolg.mail.an} ist raus. Sie enthält kein Passwort.</p>}
        <p className="mt-1 text-xs">
          {erfolg.mail && !erfolg.mail.fehler
            ? "Gib das Startpasswort auf anderem Weg weiter. Beim ersten Anmelden muss ein eigenes Passwort vergeben werden."
            : "Gib beides weiter. Beim ersten Anmelden muss ein eigenes Passwort vergeben werden."}
        </p>
      </div>
      {erfolg.mail?.fehler && <Fehler text={`Mail an ${erfolg.mail.an} ging nicht raus: ${erfolg.mail.fehler}.`} />}
    </div>
  );
}

function MailKaestchen({ text }: { text: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name="mailSenden" value="ja" defaultChecked className="mt-0.5 h-4 w-4" />
      <span>{text}</span>
    </label>
  );
}

// Admin: neuen Helfer anlegen.
export function HelferAnlegenFormular({ vorschlag, mailBereit }: { vorschlag: string; mailBereit: boolean }) {
  const [zustand, absenden, sendetGerade] = useActionState<HelferFormularState, FormData>(helferAnlegen, {
    error: null,
  });

  return (
    <form action={absenden} className="flex flex-col gap-3">
      <Fehler text={zustand.error} />
      {zustand.erfolg && <Zugangsdaten erfolg={zustand.erfolg} text="Helfer angelegt." />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="helfer-name">Name</Label>
          <Input id="helfer-name" name="name" required minLength={2} maxLength={40} autoComplete="off" placeholder="z.B. Anna" />
        </div>
        <div>
          <Label htmlFor="helfer-stufe">Rechte</Label>
          <Select id="helfer-stufe" name="stufe" defaultValue="SCHREIBEN">
            <option value="SCHREIBEN">Lesen und schreiben</option>
            <option value="LESEN">Nur lesen</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="helfer-passwort">Startpasswort</Label>
          {/* key: nach dem Anlegen einen frischen Vorschlag zeigen */}
          <Input id="helfer-passwort" name="passwort" required minLength={8} autoComplete="off" defaultValue={vorschlag} key={vorschlag} />
        </div>
      </div>
      <div>
        <Label htmlFor="helfer-email">E-Mail (freiwillig)</Label>
        {/* key: nach dem Anlegen leeren */}
        <Input id="helfer-email" name="email" type="email" autoComplete="off" placeholder="anna@example.de" key={`email-${vorschlag}`} />
        <p className="mt-1 text-xs text-muted">
          {mailBereit
            ? "Dorthin geht der Link zur App. Damit kann der Helfer auch selbst ein neues Passwort anfordern."
            : "Wird gespeichert. Mails gehen erst raus, wenn der E-Mail-Versand eingerichtet ist (Einstellungen, E-Mail-Versand)."}
        </p>
      </div>
      {mailBereit && <MailKaestchen text="Link zur App per Mail schicken (ohne Passwort)" />}
      <div>
        <Button type="submit" disabled={sendetGerade}>
          {sendetGerade ? "Wird angelegt …" : "Helfer anlegen"}
        </Button>
      </div>
    </form>
  );
}

// Admin: neues Startpasswort für einen Helfer. Klappt erst auf Knopfdruck auf.
export function HelferPasswortZuruecksetzen({
  nutzerId,
  name,
  vorschlag,
  email,
}: {
  nutzerId: string;
  name: string;
  vorschlag: string;
  /** Nur gesetzt, wenn eine Adresse da ist und der Mailversand läuft. */
  email: string | null;
}) {
  const [offen, setOffen] = useState(false);
  const [zustand, absenden, sendetGerade] = useActionState<HelferFormularState, FormData>(
    helferPasswortZuruecksetzen.bind(null, nutzerId),
    { error: null },
  );

  if (zustand.erfolg) return <Zugangsdaten erfolg={zustand.erfolg} text={`Passwort von ${name} zurückgesetzt.`} />;
  if (!offen) {
    return (
      <Button type="button" variant="secondary" groesse="klein" onClick={() => setOffen(true)}>
        Passwort zurücksetzen
      </Button>
    );
  }
  return (
    <form action={absenden} className="flex w-full flex-col gap-2 rounded-md border border-border p-3">
      <Fehler text={zustand.error} />
      <Label htmlFor={`neu-${nutzerId}`}>Neues Startpasswort für {name}</Label>
      <Input id={`neu-${nutzerId}`} name="passwort" required minLength={8} autoComplete="off" defaultValue={vorschlag} />
      <p className="text-xs text-muted">{name} wird sofort auf allen Geräten abgemeldet und muss beim nächsten Anmelden ein eigenes Passwort vergeben.</p>
      {email && <MailKaestchen text={`Hinweis an ${email} schicken (ohne Passwort)`} />}
      <div className="flex gap-2">
        <Button type="submit" groesse="klein" disabled={sendetGerade}>
          Zurücksetzen
        </Button>
        <Button type="button" variant="secondary" groesse="klein" onClick={() => setOffen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

// Admin: E-Mail-Adresse eines Helfers ändern und den Link zur App (noch
// einmal) schicken.
export function HelferEmail({ nutzerId, email, mailBereit }: { nutzerId: string; email: string | null; mailBereit: boolean }) {
  const [offen, setOffen] = useState(false);
  const [speichernZustand, speichern, speichertGerade] = useActionState<HelferEmailState, FormData>(
    async (vorher, formData) => {
      const ergebnis = await helferEmailSpeichern(nutzerId, vorher, formData);
      if (!ergebnis.error) setOffen(false);
      return ergebnis;
    },
    { error: null },
  );
  const [sendenZustand, senden, sendetGerade] = useActionState<HelferEmailState, FormData>(
    helferZugangsMailSenden.bind(null, nutzerId),
    { error: null },
  );

  if (offen) {
    return (
      <form action={speichern} className="flex w-full flex-col gap-2 rounded-md border border-border p-3">
        <Fehler text={speichernZustand.error} />
        <Label htmlFor={`email-${nutzerId}`}>E-Mail</Label>
        <Input id={`email-${nutzerId}`} name="email" type="email" autoComplete="off" defaultValue={email ?? ""} placeholder="leer lassen für keine" />
        <div className="flex gap-2">
          <Button type="submit" groesse="klein" disabled={speichertGerade}>
            Speichern
          </Button>
          <Button type="button" variant="secondary" groesse="klein" onClick={() => setOffen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    );
  }

  const meldung = sendenZustand.meldung ?? speichernZustand.meldung;
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted">{email ? `E-Mail: ${email}` : "Keine E-Mail hinterlegt."}</p>
      <Fehler text={sendenZustand.error} />
      {meldung && <p className="text-sm text-ok">{meldung}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" groesse="klein" onClick={() => setOffen(true)}>
          {email ? "E-Mail ändern" : "E-Mail eintragen"}
        </Button>
        {email && mailBereit && (
          <form action={senden}>
            <Button type="submit" variant="secondary" groesse="klein" disabled={sendetGerade}>
              {sendetGerade ? "Wird gesendet …" : "Link zur App senden"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// Helfer: eigenes Passwort ändern, beim ersten Anmelden zwangsweise.
export function PasswortAendernFormular({ erzwungen, mindestlaenge }: { erzwungen: boolean; mindestlaenge: number }) {
  const [zustand, absenden, sendetGerade] = useActionState<PasswortAendernState, FormData>(eigenesPasswortAendern, {
    error: null,
  });

  return (
    <form action={absenden} className="flex max-w-md flex-col gap-4" data-lesen-erlaubt>
      <Fehler text={zustand.error} />
      {zustand.gespeichert && (
        <p className="rounded-md border border-ok-rand bg-ok-flaeche px-3 py-2 text-sm text-ok">
          Neues Passwort gespeichert. Andere Geräte sind abgemeldet.
        </p>
      )}
      <div>
        <Label htmlFor="bisher">{erzwungen ? "Startpasswort" : "Bisheriges Passwort"}</Label>
        <Input id="bisher" name="bisher" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="passwort">Neues Passwort</Label>
        <Input id="passwort" name="passwort" type="password" autoComplete="new-password" required minLength={mindestlaenge} />
        <p className="mt-1 text-xs text-muted">Mindestens {mindestlaenge} Zeichen.</p>
      </div>
      <div>
        <Label htmlFor="passwortWiederholung">Neues Passwort wiederholen</Label>
        <Input id="passwortWiederholung" name="passwortWiederholung" type="password" autoComplete="new-password" required minLength={mindestlaenge} />
      </div>
      <div>
        <Button type="submit" disabled={sendetGerade} data-lesen-erlaubt>
          {sendetGerade ? "Wird gespeichert …" : "Passwort speichern"}
        </Button>
      </div>
    </form>
  );
}
