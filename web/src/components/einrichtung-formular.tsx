"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { IconLogo } from "@/components/icons";
import { einrichten, type EinrichtenState } from "@/lib/einrichtung-actions";

// Erster Start: Einrichtungscode aus dem Installationsskript, Angaben zum
// Betrieb und der Hauptzugang. Alles außer Code und Zugang lässt sich später
// unter Einstellungen ändern.
export function EinrichtungFormular({
  bundeslaender,
  passwortMindestlaenge,
  updatePruefung,
}: {
  bundeslaender: { kuerzel: string; name: string }[];
  passwortMindestlaenge: number;
  /// Schalter für die tägliche Update-Prüfung zeigen (nur mit Versionsnummer).
  updatePruefung: boolean;
}) {
  const [zustand, absenden, sendetGerade] = useActionState<EinrichtenState, FormData>(einrichten, {
    error: null,
  });
  const felder = zustand.felder;

  return (
    <form
      action={absenden}
      // React leert das Formular nach dem Absenden - so stehen die Angaben
      // nach einem Fehler wieder drin.
      key={zustand.error ?? ""}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">Willkommen bei der Imkereiverwaltung</h1>
        <p className="text-sm text-muted">
          Die App ist installiert. Lege jetzt deinen Zugang an. Das geht nur einmal.
        </p>
      </div>

      {zustand.error && (
        <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
          {zustand.error}
        </p>
      )}

      <div>
        <Label htmlFor="code">Einrichtungscode</Label>
        <Input id="code" name="code" required autoComplete="off" autoFocus spellCheck={false} />
        <p className="mt-1 text-xs text-muted">
          Steht am Ende der Installation. So kann niemand sonst deine App übernehmen.
        </p>
      </div>

      <div>
        <Label htmlFor="halterName">Dein Name</Label>
        <Input id="halterName" name="halterName" required autoComplete="name" defaultValue={felder?.halterName} />
        <p className="mt-1 text-xs text-muted">Steht zum Beispiel im Bestandsbuch.</p>
      </div>
      <div>
        <Label htmlFor="menueName">Name der Imkerei</Label>
        <Input id="menueName" name="menueName" placeholder="Imkereiverwaltung" defaultValue={felder?.menueName} />
        <p className="mt-1 text-xs text-muted">Steht oben im Menü. Darf leer bleiben.</p>
      </div>
      <div>
        <Label htmlFor="bundesland">Bundesland</Label>
        <Select id="bundesland" name="bundesland" defaultValue={felder?.bundesland ?? ""}>
          <option value="">Nicht angeben</option>
          {bundeslaender.map((land) => (
            <option key={land.kuerzel} value={land.kuerzel}>
              {land.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="benutzername">Benutzername</Label>
        <Input
          id="benutzername"
          name="benutzername"
          required
          autoComplete="username"
          minLength={2}
          maxLength={40}
          defaultValue={felder?.benutzername}
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

      {updatePruefung && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="updatePruefung"
            value="an"
            defaultChecked={felder?.updatePruefung ?? true}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Täglich nach Updates suchen</span>
            <span className="block text-muted">
              Der Server fragt einmal am Tag bei GitHub nach einer neuen Version. Dabei gehen keine
              Daten deiner Imkerei raus. Lässt sich unter Einstellungen → System jederzeit ändern.
            </span>
          </span>
        </label>
      )}

      <Button type="submit" disabled={sendetGerade}>
        {sendetGerade ? "Wird eingerichtet …" : "Einrichten"}
      </Button>
    </form>
  );
}
