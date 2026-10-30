"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Label, Input } from "@/components/ui";
import { anmelden } from "@/lib/actions";
import { IconLogo } from "@/components/icons";

// Normales Formular statt Browser-eigener Passwortabfrage (HTTP Basic Auth):
// bekommt auf dem iPhone/iPad die volle Unterstützung für Face ID und den
// Schlüsselbund, anders als Basic Auth (siehe Projektstand.md).
//
// Beide Felder bewusst "controlled" (value/onChange statt nur defaultValue):
// beim Testen zeigte sich, dass der Browser nach einem Fehlversuch das
// Benutzername-Feld selbst leerte (vermutlich sein eigener
// Passwort-Manager) - ein zweiter Versuch scheiterte dann lautlos an der
// Pflichtfeld-Prüfung, ohne dass die Aktion je aufgerufen wurde. Mit React
// als alleiniger Quelle für den Feldwert kann der Browser das nicht mehr
// unbemerkt tun.
//
// Kein <form action={...}> mit useActionState (wie sonst in der App
// üblich), sondern wie beim Schnell-Bearbeiten-Dialog
// (volk-bearbeiten-dialog.tsx) die Aktion von Hand mit der
// Formular-FormData aufrufen.
export function LoginFormular({ weiter, passwortVergessen }: { weiter: string; passwortVergessen: boolean }) {
  const [benutzername, setBenutzername] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendetGerade, setSendetGerade] = useState(false);

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendetGerade(true);
    try {
      // Aus dem React-Zustand statt aus dem Formular-Element selbst
      // (new FormData(event.currentTarget)) aufbauen: der Browser leerte
      // beim Testen nach einem Fehlversuch das Benutzername-Feld auf
      // DOM-Ebene (vermutlich sein eigener Passwort-Manager, ohne dass
      // dabei ein von React beobachtbares Ereignis ausgelöst wurde) - ein
      // zweiter Versuch scheiterte dadurch an der eigentlich schon
      // ausgefüllten Pflichtangabe. Der React-Zustand bleibt davon
      // unberührt, weil er nur beim echten Tippen aktualisiert wird.
      const formData = new FormData();
      formData.set("benutzername", benutzername);
      formData.set("passwort", passwort);
      formData.set("weiter", weiter);
      const ergebnis = await anmelden({ error: null }, formData);
      setFehler(ergebnis.error);
    } finally {
      setSendetGerade(false);
    }
  }

  return (
    <form
      onSubmit={absenden}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">Imkereiverwaltung</h1>
      </div>

      {fehler && (
        <p className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr">
          {fehler}
        </p>
      )}

      <div>
        <Label htmlFor="benutzername">Benutzername</Label>
        <Input
          id="benutzername"
          name="benutzername"
          autoComplete="username"
          required
          autoFocus
          value={benutzername}
          onChange={(e) => setBenutzername(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="passwort">Passwort</Label>
        <Input
          id="passwort"
          name="passwort"
          type="password"
          autoComplete="current-password"
          required
          value={passwort}
          onChange={(e) => setPasswort(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={sendetGerade}>
        {sendetGerade ? "Wird geprüft …" : "Anmelden"}
      </Button>

      {passwortVergessen && (
        <Link href="/passwort-vergessen" className="text-center text-sm text-muted hover:text-accent hover:underline">
          Passwort vergessen?
        </Link>
      )}
    </form>
  );
}
