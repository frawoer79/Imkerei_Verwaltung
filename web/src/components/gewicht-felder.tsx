"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Label, Input, Select } from "@/components/ui";
import { WIEGEMETHODE_OPTIONEN, gewichtFuersFeld, gewichtSummeAuswerten } from "@/lib/gewicht-summe";

// Wiegemethode + Gewicht im Stockkarteneintrag (Einzel-, Sammeleintrag und
// Bearbeiten nutzen alle dieses Bauteil). Ins Gewichtsfeld kann man auch
// Teilgewichte als Summe tippen ("13+17"); beim Verlassen des Felds steht dort
// das Ergebnis. Speichert man direkt ohne das Feld zu verlassen, rechnet der
// Server mit derselben Funktion.
//
// Tastatur am iPhone/iPad: Der Nummernblock (inputMode="decimal") hat kein
// Plus, und eine Web-Seite kann keinen Nummernblock mit Rechenzeichen
// anfordern. Darum bleibt der Nummernblock, und bei "vollständig" steht neben
// dem Feld ein eigener "+"-Knopf, der das Pluszeichen an der Schreibmarke
// einfügt, ohne dass die Tastatur zugeht.
export function GewichtFelder({
  wiegemethode,
  gewichtKg,
}: {
  wiegemethode?: string | null;
  gewichtKg?: number | null;
}) {
  const [methode, setMethode] = useState(wiegemethode ?? "");
  const [text, setText] = useState(gewichtKg == null ? "" : gewichtFuersFeld(gewichtKg));
  const [fehler, setFehler] = useState(false);
  const feld = useRef<HTMLInputElement>(null);

  const auswertung = gewichtSummeAuswerten(text);
  const vollstaendig = methode === "VOLLSTAENDIG";

  function pruefen(neuerText: string, ersetzen: boolean) {
    const ergebnis = gewichtSummeAuswerten(neuerText);
    const ungueltig = ergebnis.art === "fehler";
    // Ungültige Eingabe blockiert das Speichern mit der Meldung des Browsers.
    feld.current?.setCustomValidity(ungueltig ? "Bitte nur Zahlen und + eingeben, z.B. 13,5+17" : "");
    if (ersetzen) {
      setFehler(ungueltig);
      if (ergebnis.art === "zahl") setText(gewichtFuersFeld(ergebnis.wert));
    } else if (!ungueltig) {
      setFehler(false);
    }
  }

  function plusEinfuegen() {
    const input = feld.current;
    if (!input) return;
    const anfang = input.selectionStart ?? text.length;
    const ende = input.selectionEnd ?? text.length;
    const neu = text.slice(0, anfang) + "+" + text.slice(ende);
    // Sofort ins Feld schreiben, damit die Schreibmarke direkt hinter das
    // Plus gesetzt werden kann und das nächste Gewicht dort landet.
    flushSync(() => setText(neu));
    pruefen(neu, false);
    input.focus();
    input.setSelectionRange(anfang + 1, anfang + 1);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="wiegemethode">Wiegemethode</Label>
        <Select id="wiegemethode" name="wiegemethode" value={methode} onChange={(e) => setMethode(e.target.value)}>
          <option value="">keine Auswahl</option>
          {WIEGEMETHODE_OPTIONEN.map((option) => (
            <option key={option.wert} value={option.wert}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="gewichtKg">Gewicht (kg)</Label>
        <div className="flex gap-2">
          <Input
            ref={feld}
            id="gewichtKg"
            name="gewichtKg"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={vollstaendig ? "z.B. 13+17" : undefined}
            value={text}
            aria-invalid={fehler || undefined}
            onChange={(e) => {
              setText(e.target.value);
              pruefen(e.target.value, false);
            }}
            onBlur={(e) => pruefen(e.target.value, true)}
          />
          {vollstaendig && (
            <button
              type="button"
              aria-label="Plus einfügen"
              title="Plus einfügen"
              // Auf pointerdown den Fokus im Feld halten, sonst schließt sich
              // am Handy die Tastatur und das Feld rechnet sofort.
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={plusEinfuegen}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-rand-ruhig bg-card text-2xl font-medium hover:bg-card"
            >
              +
            </button>
          )}
        </div>
        {fehler ? (
          <p className="mt-1 text-xs text-gefahr">
            Nur Zahlen und + verwenden, z.B. 13,5+17.
          </p>
        ) : auswertung.art === "zahl" && auswertung.summanden > 1 ? (
          <p className="mt-1 text-xs text-muted">= {gewichtFuersFeld(auswertung.wert)} kg</p>
        ) : vollstaendig ? (
          <p className="mt-1 text-xs text-muted">Teilgewichte mit + zusammenzählen, z.B. 13+17.</p>
        ) : null}
      </div>
    </div>
  );
}
