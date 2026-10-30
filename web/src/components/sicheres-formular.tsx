"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui";

// Formular für Server-Aktionen, das bei einem Fehler nicht die ganze Seite
// durch eine Fehlerseite ersetzt. Zwei Fälle:
//  - Die Aktion meldet einen Prüffehler als Rückgabewert ({ fehler: "…" },
//    z.B. doppelter Volksname) - der Text erscheint rot über dem Knopf.
//  - Die Anfrage scheitert ganz (Funkloch, Server weg) - dann ebenfalls eine
//    Meldung statt der Fehlerseite.
// In beiden Fällen bleibt alles Eingegebene im Formular stehen: Abgeschickt
// wird per onSubmit statt über das action-Attribut, weil React ein Formular
// mit action nach dem Absenden leert - auch wenn gar nicht gespeichert wurde.
// Das action-Attribut bleibt trotzdem gesetzt, damit ein Absenden vor dem
// Laden des JavaScripts weiter funktioniert.

export type AktionsErgebnis = { fehler?: string } | void;

type FormularZustand = { fehler: string | null; sendetGerade: boolean };

/// Auch von StockkartenEintragFormular genutzt, damit <FormularFehler /> dort
/// genauso funktioniert.
export const FormularKontext = createContext<FormularZustand>({ fehler: null, sendetGerade: false });

/// Meldung für eine Anfrage, die gar nicht erst beim Server angekommen ist
/// oder dort abgestürzt ist (statt eines Rückgabewerts).
export function speicherFehlerTitel(fehler: unknown): string {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return offline || fehler instanceof TypeError
    ? "Nicht gespeichert: keine Verbindung zum Server."
    : "Nicht gespeichert: Der Server hat einen Fehler gemeldet.";
}

export function SicheresFormular({
  action,
  beiErfolg,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<AktionsErgebnis>;
  /// Nach erfolgreichem Speichern ohne Weiterleitung (z.B. Dialog schließen).
  beiErfolg?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendetGerade, startTransition] = useTransition();

  function beiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendetGerade) return;
    const formData = new FormData(event.currentTarget);
    setFehler(null);
    startTransition(async () => {
      try {
        const ergebnis = await action(formData);
        if (ergebnis && ergebnis.fehler) {
          setFehler(ergebnis.fehler);
          return;
        }
        beiErfolg?.();
      } catch (ausnahme) {
        // Eine Weiterleitung nach dem Speichern kommt hier ebenfalls als
        // "Fehler" an - die muss weiter zu Next.js, sonst bliebe man stehen.
        unstable_rethrow(ausnahme);
        setFehler(`${speicherFehlerTitel(ausnahme)} Deine Eingaben sind noch da. Versuch es gleich noch einmal.`);
      }
    });
  }

  return (
    <FormularKontext.Provider value={{ fehler, sendetGerade }}>
      <form
        action={action as (formData: FormData) => Promise<void>}
        onSubmit={beiSubmit}
        className={className}
      >
        {children}
      </form>
    </FormularKontext.Provider>
  );
}

/// Fehlermeldung des umgebenden Formulars - direkt über den Speichern-Knopf
/// setzen. Ohne Fehler wird nichts gezeichnet.
export function FormularFehler({ meldung }: { meldung?: string | null }) {
  const { fehler } = useContext(FormularKontext);
  const text = meldung ?? fehler;
  if (!text) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-gefahr-rand bg-gefahr-flaeche px-3 py-2 text-sm text-gefahr"
    >
      {text}
    </p>
  );
}

/// Absenden-Knopf, der sich während des Speicherns sperrt - so legt ein
/// zweites Antippen bei langsamer Verbindung nichts doppelt an.
export function SpeichernKnopf({
  children,
  sendetText = "Wird gespeichert …",
  className,
}: {
  children: React.ReactNode;
  sendetText?: string;
  className?: string;
}) {
  const { sendetGerade } = useContext(FormularKontext);
  return (
    <Button type="submit" disabled={sendetGerade} className={className}>
      {sendetGerade ? sendetText : children}
    </Button>
  );
}
