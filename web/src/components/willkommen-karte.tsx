"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconLogo } from "@/components/icons";
import { knopfKlassen } from "@/components/ui";

const keineAbonnements = () => () => {};

// Nach dem Einrichten bzw. Neuvergeben des Passworts: der Tester ist
// angemeldet und ruft seinen Einladungslink noch einmal auf. Zeigt die Adresse der App, damit er sie sich merkt - der
// Einladungslink funktioniert nur einmal, ab dann zählt die normale Adresse.
export function WillkommenKarte({ name }: { name: string }) {
  const adresse = useSyncExternalStore(
    keineAbonnements,
    () => window.location.origin,
    () => "",
  );

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex flex-col items-center gap-2 text-center">
        <IconLogo className="h-10 w-10 text-accent" />
        <h1 className="text-lg font-semibold tracking-tight">
          Willkommen, {name}
        </h1>
        <p className="text-sm text-muted">Dein Zugang steht, du bist jetzt angemeldet.</p>
      </div>

      <div className="rounded-md border border-border bg-background px-3 py-3 text-sm">
        <p className="mb-1 font-medium">Merk dir diese Adresse</p>
        <p className="mb-2 break-all rounded-md border border-border bg-card px-3 py-2 font-mono text-xs">
          {adresse}
        </p>
        <p className="text-muted">
          Der Einladungslink funktioniert nur einmal. Beim nächsten Mal öffnest du einfach diese
          Adresse und meldest dich mit deinem Namen und Passwort an. Am besten setzt du jetzt ein
          Lesezeichen oder legst die Seite auf den Home-Bildschirm.
        </p>
      </div>

      <div className="rounded-md border border-border bg-background px-3 py-3 text-sm">
        <p className="mb-1 font-medium">Zum Ausprobieren schon da</p>
        <p className="text-muted">
          Ein erfundener Beispielstand mit drei Völkern und einer Saison Durchsichten, Ernten und
          Behandlungen. Wie alles zusammenhängt, erklärt die Anleitung. Du findest sie jederzeit im
          Menü unter „Anleitung“.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Link
          href="/"
          className={`${knopfKlassen("primary", "klein")} min-h-12 flex-1`}
        >
          Los geht&apos;s
        </Link>
        <Link
          href="/anleitung"
          className={`${knopfKlassen("secondary", "klein")} min-h-12 flex-1`}
        >
          Anleitung lesen
        </Link>
      </div>
    </div>
  );
}
