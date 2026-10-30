"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { TELEFON_HINWEIS, TELEFON_MUSTER, TELEFON_ZEICHEN, telefonGueltig } from "@/lib/telefon";

// Telefonfeld: Buchstaben und andere unerlaubte Zeichen erscheinen beim Tippen
// gar nicht erst. Ein schon gespeicherter alter Wert bleibt stehen, bekommt
// aber einen Hinweis, und das Formular lässt sich erst nach der Korrektur
// speichern (pattern). Am Handy kommt die Telefontastatur (type="tel").
export function TelefonFeld({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  const [wert, setWert] = useState(defaultValue);
  const gueltig = telefonGueltig(wert);
  const feld = useRef<HTMLInputElement>(null);

  // Eigener Text statt der englischen Browser-Meldung beim Speichern.
  useEffect(() => {
    feld.current?.setCustomValidity(gueltig ? "" : TELEFON_HINWEIS);
  }, [gueltig]);

  return (
    <>
      <Input
        ref={feld}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        pattern={TELEFON_MUSTER}
        title={TELEFON_HINWEIS}
        value={wert}
        onChange={(ereignis) => {
          const neu = ereignis.target.value;
          // Nur filtern, wenn der Wert vorher gültig war. Sonst könnte ein
          // einzelnes Löschen im alten Wert alle Buchstaben auf einmal tilgen.
          setWert(telefonGueltig(wert) ? neu.replace(TELEFON_ZEICHEN, "") : neu);
        }}
        aria-invalid={!gueltig}
        aria-describedby={gueltig ? undefined : `${id}-hinweis`}
      />
      {!gueltig && (
        <p id={`${id}-hinweis`} className="mt-1 text-sm text-gefahr">
          {TELEFON_HINWEIS}
        </p>
      )}
    </>
  );
}
