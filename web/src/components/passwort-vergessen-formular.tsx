"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { IconLogo } from "@/components/icons";
import {
  passwortPerLinkSetzen,
  passwortVergessenAnfordern,
  type PasswortAendernState,
  type PasswortVergessenState,
} from "@/lib/nutzer-actions";

function Rahmen({ titel, text, children }: { titel: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">{titel}</h1>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

function Fehler({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">{text}</p>
  );
}

const zurAnmeldung = (
  <Link href="/login" className="text-center text-sm font-medium text-accent hover:underline">
    Zur Anmeldung
  </Link>
);

// Helfer fordert einen Link an. Die Antwort ist immer gleich, damit niemand
// herausfinden kann, welche Namen es gibt.
export function PasswortVergessenFormular({ gueltigMinuten }: { gueltigMinuten: number }) {
  const [zustand, absenden, sendetGerade] = useActionState<PasswortVergessenState, FormData>(
    passwortVergessenAnfordern,
    { error: null },
  );

  if (zustand.gesendet) {
    return (
      <Rahmen
        titel="Schau in dein Postfach"
        text={`Ist für diesen Namen eine E-Mail-Adresse hinterlegt, kommt gleich ein Link. Er gilt ${gueltigMinuten} Minuten. Keine Mail? Dann hilft dir der Admin weiter.`}
      >
        {zurAnmeldung}
      </Rahmen>
    );
  }

  return (
    <Rahmen
      titel="Passwort vergessen"
      text="Gib deinen Benutzernamen ein. Du bekommst einen Link an deine hinterlegte E-Mail-Adresse."
    >
      <form action={absenden} className="flex flex-col gap-4">
        <Fehler text={zustand.error} />
        <div>
          <Label htmlFor="benutzername">Benutzername</Label>
          <Input id="benutzername" name="benutzername" autoComplete="username" required autoFocus />
        </div>
        <Button type="submit" disabled={sendetGerade}>
          {sendetGerade ? "Wird gesendet …" : "Link anfordern"}
        </Button>
      </form>
      {zurAnmeldung}
    </Rahmen>
  );
}

// Seite hinter dem Link aus der Mail.
export function PasswortPerLinkFormular({
  token,
  name,
  mindestlaenge,
}: {
  token: string;
  name: string;
  mindestlaenge: number;
}) {
  const [zustand, absenden, sendetGerade] = useActionState<PasswortAendernState, FormData>(
    passwortPerLinkSetzen.bind(null, token),
    { error: null },
  );

  return (
    <Rahmen titel="Neues Passwort" text={`${name}, vergib jetzt ein neues Passwort. Danach bist du angemeldet.`}>
      <form action={absenden} className="flex flex-col gap-4">
        <Fehler text={zustand.error} />
        <input type="hidden" name="benutzername" value={name} autoComplete="username" readOnly />
        <div>
          <Label htmlFor="passwort">Neues Passwort</Label>
          <Input id="passwort" name="passwort" type="password" autoComplete="new-password" required minLength={mindestlaenge} />
          <p className="mt-1 text-xs text-muted">Mindestens {mindestlaenge} Zeichen.</p>
        </div>
        <div>
          <Label htmlFor="passwortWiederholung">Neues Passwort wiederholen</Label>
          <Input
            id="passwortWiederholung"
            name="passwortWiederholung"
            type="password"
            autoComplete="new-password"
            required
            minLength={mindestlaenge}
          />
        </div>
        <Button type="submit" disabled={sendetGerade}>
          {sendetGerade ? "Wird gespeichert …" : "Passwort speichern"}
        </Button>
      </form>
    </Rahmen>
  );
}

export function LinkUngueltig() {
  return (
    <Rahmen
      titel="Link nicht gültig"
      text="Der Link ist abgelaufen oder wurde schon benutzt. Fordere bei Bedarf einen neuen an."
    >
      <Link href="/passwort-vergessen" className="text-center text-sm font-medium text-accent hover:underline">
        Neuen Link anfordern
      </Link>
      {zurAnmeldung}
    </Rahmen>
  );
}
