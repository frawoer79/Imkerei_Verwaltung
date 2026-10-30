"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { IconLogo } from "@/components/icons";
import { einladungEinloesen, type EinloesenState } from "@/lib/testzugang-actions";

// Erster Besuch über den persönlichen Einladungslink: Hinweis zur
// Testinstanz lesen und bestätigen, Name und Passwort vergeben.
export function EinladungFormular({
  token,
  passwortMindestlaenge,
}: {
  token: string;
  passwortMindestlaenge: number;
}) {
  const [zustand, absenden, sendetGerade] = useActionState<EinloesenState, FormData>(
    einladungEinloesen.bind(null, token),
    { error: null },
  );

  return (
    <form
      action={absenden}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">Willkommen zum Testzugang</h1>
        <p className="text-sm text-muted">
          Du bist eingeladen, die Imkereiverwaltung auszuprobieren. Du arbeitest mit deinen
          eigenen Daten, niemand sonst sieht sie.
        </p>
      </div>

      <div className="rounded-md border border-warnung-rand bg-warnung-flaeche px-3 py-3 text-sm text-warnung">
        <p className="mb-1 font-semibold">Bitte beachten</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Das ist nur eine Testversion zum Ausprobieren.</li>
          <li>
            Für deine Daten gibt es keine Garantie. Sie können verloren gehen oder gelöscht
            werden, auch ohne Vorankündigung.
          </li>
          <li>
            Die App wird laufend weiterentwickelt. Vieles kann sich noch ändern.
          </li>
        </ul>
      </div>

      {zustand.error && (
        <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
          {zustand.error}
        </p>
      )}

      <div>
        <Label htmlFor="name">Dein Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="username"
          required
          minLength={2}
          maxLength={40}
          defaultValue={zustand.name ?? ""}
          // React leert das Formular nach dem Absenden - so steht der Name
          // nach einem Fehler wieder drin.
          key={zustand.error ?? ""}
        />
        <p className="mt-1 text-xs text-muted">Damit meldest du dich später an.</p>
      </div>
      <div>
        <Label htmlFor="passwort">Passwort</Label>
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

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="hinweisGelesen" value="ja" required className="mt-0.5 h-4 w-4" />
        <span>Ich habe den Hinweis gelesen und bin einverstanden.</span>
      </label>

      <Button type="submit" disabled={sendetGerade}>
        {sendetGerade ? "Wird eingerichtet …" : "Zugang einrichten"}
      </Button>
    </form>
  );
}
