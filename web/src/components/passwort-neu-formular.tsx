"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { IconLogo } from "@/components/icons";
import { passwortNeuVergeben, type EinloesenState } from "@/lib/testzugang-actions";

// Link zum Neuvergeben des Passworts (Frank hat es für den Tester
// zurückgesetzt). Name und Daten bleiben wie sie sind.
export function PasswortNeuFormular({
  token,
  name,
  passwortMindestlaenge,
}: {
  token: string;
  name: string;
  passwortMindestlaenge: number;
}) {
  const [zustand, absenden, sendetGerade] = useActionState<EinloesenState, FormData>(
    passwortNeuVergeben.bind(null, token),
    { error: null },
  );

  return (
    <form
      action={absenden}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">Neues Passwort vergeben</h1>
        <p className="text-sm text-muted">
          {name}, dein Passwort wurde zurückgesetzt. Deine Daten sind noch da. Vergib jetzt ein
          neues Passwort.
        </p>
      </div>

      {zustand.error && (
        <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
          {zustand.error}
        </p>
      )}

      <input type="hidden" name="benutzername" value={name} autoComplete="username" readOnly />
      <div>
        <Label htmlFor="passwort">Neues Passwort</Label>
        <Input
          id="passwort"
          name="passwort"
          type="password"
          autoComplete="new-password"
          required
          minLength={passwortMindestlaenge}
        />
        <p className="mt-1 text-xs text-muted">Mindestens {passwortMindestlaenge} Zeichen.</p>
      </div>
      <div>
        <Label htmlFor="passwortWiederholung">Passwort wiederholen</Label>
        <Input
          id="passwortWiederholung"
          name="passwortWiederholung"
          type="password"
          autoComplete="new-password"
          required
          minLength={passwortMindestlaenge}
        />
      </div>

      <Button type="submit" disabled={sendetGerade}>
        {sendetGerade ? "Wird gespeichert …" : "Passwort speichern"}
      </Button>
    </form>
  );
}
