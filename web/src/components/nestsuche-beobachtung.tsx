"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  MARKIERUNGSFARBEN,
  TOLERANZEN_GRAD,
  entfernungsBand,
  kuerzesteZeit,
  meterAnzeige,
  richtungAnzeige,
  zeitAnzeige,
  zeitLesen,
  type NestsucheBeobachtung,
} from "@/lib/nestsuche";
import {
  abflugSetzen,
  beobachtungAendern,
  beobachtungLoeschen,
  rundzeitEntfernen,
  rundzeitHinzufuegen,
} from "@/lib/nestsuche-actions";
import { bestaetigen } from "@/lib/bestaetigen";

// Eine markierte Hornisse: Markierung, Abflugrichtung (Karte, Kompass oder
// Schieber), Stoppuhr und Rundzeiten. Mehrere Stoppuhren können gleichzeitig
// laufen, jede Hornisse hat ihre eigene.
export function BeobachtungKarte({
  beobachtung,
  gesperrt,
  richtungZeichnenAktiv,
  onRichtungZeichnen,
  onVorschau,
  nestAbstandM,
  peilt,
  kompassGrad,
  karteDreht,
  onPeilStart,
  onPeilUebernehmen,
  onPeilAbbrechen,
}: {
  beobachtung: NestsucheBeobachtung;
  gesperrt: boolean;
  richtungZeichnenAktiv: boolean;
  onRichtungZeichnen: () => void;
  onVorschau: (grad: number | null) => void;
  nestAbstandM: number | null;
  /// Handy-Kompass ist gerade für diese Hornisse eingeschaltet.
  peilt: boolean;
  kompassGrad: number | null;
  /// Karte dreht sich mit dem Handy (Flugrichtung zeigt dann senkrecht nach oben).
  karteDreht: boolean;
  onPeilStart: () => void;
  onPeilUebernehmen: () => void;
  onPeilAbbrechen: () => void;
}) {
  const [, startTransition] = useTransition();
  const [abflugMs, setAbflugMs] = useState<number | null>(beobachtung.abflugAmMs);
  const [jetzt, setJetzt] = useState(() => Date.now());
  const [schieber, setSchieber] = useState<number | null>(null);
  const [zeitText, setZeitText] = useState("");
  const [zeitFehler, setZeitFehler] = useState(false);
  const [richtungAufgeklappt, setRichtungAufgeklappt] = useState(false);
  const schieberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stand vom Server übernehmen (z. B. nach dem Speichern).
  const [abflugVomServer, setAbflugVomServer] = useState<number | null>(beobachtung.abflugAmMs);
  if (beobachtung.abflugAmMs !== abflugVomServer) {
    setAbflugVomServer(beobachtung.abflugAmMs);
    setAbflugMs(beobachtung.abflugAmMs);
  }

  useEffect(() => {
    if (abflugMs === null) return;
    const takt = setInterval(() => setJetzt(Date.now()), 250);
    return () => clearInterval(takt);
  }, [abflugMs]);

  const kuerzeste = kuerzesteZeit(beobachtung);
  const band = kuerzeste !== null ? entfernungsBand(kuerzeste) : null;
  const richtung = schieber ?? beobachtung.richtungGrad;

  function abflug() {
    const zeitpunkt = Date.now();
    setAbflugMs(zeitpunkt);
    setJetzt(zeitpunkt);
    startTransition(() => abflugSetzen(beobachtung.id, zeitpunkt));
  }

  function zurueck() {
    if (abflugMs === null) return;
    const sekunden = Math.round((Date.now() - abflugMs) / 1000);
    setAbflugMs(null);
    startTransition(() => rundzeitHinzufuegen(beobachtung.id, sekunden));
  }

  function stoppuhrAbbrechen() {
    setAbflugMs(null);
    startTransition(() => abflugSetzen(beobachtung.id, null));
  }

  function zeitEintragen() {
    const sekunden = zeitLesen(zeitText);
    if (sekunden === null) {
      setZeitFehler(true);
      return;
    }
    setZeitFehler(false);
    setZeitText("");
    startTransition(() => rundzeitHinzufuegen(beobachtung.id, sekunden));
  }

  function schieberAendern(grad: number) {
    setSchieber(grad);
    onVorschau(grad);
    if (schieberTimerRef.current) clearTimeout(schieberTimerRef.current);
    schieberTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        await beobachtungAendern(beobachtung.id, { richtungGrad: grad });
        setSchieber(null);
        onVorschau(null);
      });
    }, 700);
  }

  // Richtung einstellen (Karte, Kompass, Schieber, Genauigkeit) klappt nur bei
  // Bedarf auf: per Antippen der Richtung, solange noch keine gesetzt ist, beim
  // Einzeichnen und während der Kompass-Peilung.
  const richtungOffen = richtungAufgeklappt || peilt || richtungZeichnenAktiv || (richtung === null && !gesperrt);
  const [zeitOffen, setZeitOffen] = useState(false);
  const zeitFeldOffen = zeitOffen || zeitFehler;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-background p-2.5" style={{ borderLeft: `4px solid ${beobachtung.farbe}` }}>
      {/* Zeile 1: Markierung, Richtung, Ergebnis */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden className="inline-block h-3.5 w-3.5 flex-none rounded-full border border-border" style={{ background: beobachtung.farbe }} />
          <select
            value={beobachtung.farbe}
            disabled={gesperrt}
            aria-label="Markierung"
            className="rounded-md border border-transparent bg-transparent py-0.5 pr-1 text-sm hover:border-border"
            onChange={(event) => {
              const eintrag = MARKIERUNGSFARBEN.find((farbe) => farbe.farbe === event.target.value);
              if (eintrag) startTransition(() => beobachtungAendern(beobachtung.id, { farbe: eintrag.farbe, markierung: eintrag.name }));
            }}
          >
            {MARKIERUNGSFARBEN.map((eintrag) => (
              <option key={eintrag.farbe} value={eintrag.farbe}>
                {eintrag.name}
              </option>
            ))}
          </select>
          <span className="sr-only">markiert</span>
        </label>
        <button
          type="button"
          aria-expanded={richtungOffen}
          disabled={gesperrt}
          onClick={() => setRichtungAufgeklappt((alt) => !alt)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-sm"
        >
          {richtung !== null ? (
            <>
              {richtungAnzeige(richtung)} · ±{beobachtung.toleranzGrad}°
            </>
          ) : (
            <span className="text-muted">Richtung setzen</span>
          )}
          {!gesperrt && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d={richtungOffen ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
            </svg>
          )}
        </button>
        <span className="flex-1" />
        {band && kuerzeste !== null && (
          <span
            className="whitespace-nowrap text-sm font-bold"
            title={`Kürzeste Runde ${zeitAnzeige(kuerzeste)} → Nest ca. ${meterAnzeige(band.minM)}–${meterAnzeige(band.maxM)} entfernt`}
          >
            {meterAnzeige(band.minM)}–{meterAnzeige(band.maxM)}
          </span>
        )}
      </div>

      {/* Zeile 2: Stoppuhr und Rundzeiten */}
      <div className="flex flex-wrap items-center gap-1.5">
        {!gesperrt &&
          (abflugMs === null ? (
            <Button type="button" className="min-w-24 px-4 py-2" onClick={abflug}>
              Abflug
            </Button>
          ) : (
            <>
              <Button type="button" className="min-w-28 bg-ok-voll px-4 py-2 text-ok-voll-text" onClick={zurueck}>
                Zurück · {zeitAnzeige(Math.max(0, (jetzt - abflugMs) / 1000))}
              </Button>
              <button type="button" className="text-xs text-muted underline" onClick={stoppuhrAbbrechen}>
                Abbrechen
              </button>
            </>
          ))}
        {beobachtung.rundzeitenSek.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Rundzeiten">
            {beobachtung.rundzeitenSek.map((sekunden, index) => (
              <li
                key={index}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums ${
                  sekunden === kuerzeste ? "border-foreground font-bold" : "border-border text-muted"
                }`}
              >
                {zeitAnzeige(sekunden)}
                {!gesperrt && (
                  <button
                    type="button"
                    aria-label={`Zeit ${zeitAnzeige(sekunden)} entfernen`}
                    className="text-muted hover:text-gefahr"
                    onClick={() => startTransition(() => rundzeitEntfernen(beobachtung.id, index))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!gesperrt && !zeitFeldOffen && (
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-accent"
            onClick={() => setZeitOffen(true)}
          >
            + Zeit
          </button>
        )}
      </div>

      {!gesperrt && zeitFeldOffen && (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            zeitEintragen();
            if (zeitLesen(zeitText) !== null) setZeitOffen(false);
          }}
        >
          <input
            value={zeitText}
            onChange={(event) => setZeitText(event.target.value)}
            placeholder="Zeit (m:ss)"
            maxLength={10}
            inputMode="decimal"
            aria-label="Rundzeit von Hand eintragen"
            autoFocus
            className={`w-28 rounded-md border bg-card px-2 py-1 text-sm ${zeitFehler ? "border-gefahr" : "border-border"}`}
          />
          <Button type="submit" variant="secondary" className="px-3 py-1">
            Eintragen
          </Button>
          <button
            type="button"
            className="text-xs text-muted underline"
            onClick={() => {
              setZeitOffen(false);
              setZeitFehler(false);
              setZeitText("");
            }}
          >
            Abbrechen
          </button>
        </form>
      )}

      {band && kuerzeste !== null && beobachtung.rundzeitenSek.length < 3 && (
        <p className="text-xs text-muted">Kürzeste Runde {zeitAnzeige(kuerzeste)} · besser 3–5 Runden stoppen</p>
      )}
      {nestAbstandM !== null && (
        <p className="text-xs text-muted">Tatsächlich: Nest {meterAnzeige(nestAbstandM)} vom Locktopf.</p>
      )}

      {/* Richtung einstellen */}
      {richtungOffen && !gesperrt && (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          {!peilt && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={richtungZeichnenAktiv ? "primary" : "secondary"}
                className="px-3 py-1.5"
                onClick={onRichtungZeichnen}
              >
                Auf Karte zeigen
              </Button>
              <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={onPeilStart}>
                Kompass
              </Button>
              <label className="flex items-center gap-1 text-xs text-muted">
                Genauigkeit
                <select
                  value={beobachtung.toleranzGrad}
                  className="rounded-md border border-border bg-card px-1.5 py-0.5 text-xs text-foreground"
                  onChange={(event) =>
                    startTransition(() => beobachtungAendern(beobachtung.id, { toleranzGrad: Number(event.target.value) }))
                  }
                >
                  {TOLERANZEN_GRAD.map((grad) => (
                    <option key={grad} value={grad}>
                      ±{grad}°
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {peilt && (
            <div className="flex flex-col gap-2 rounded-md bg-card p-2.5">
              <p className="text-xs text-muted">
                {karteDreht
                  ? "Handy flach halten, Oberkante in Flugrichtung: Der Korridor steht senkrecht, die Karte dreht sich mit."
                  : "Handy flach halten, Oberkante in Flugrichtung. Die Linie auf der Karte läuft mit."}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <svg width="36" height="36" viewBox="-22 -22 44 44" aria-hidden>
                  <circle r="20" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                  <g transform={`rotate(${kompassGrad ?? 0})`}>
                    <path d="M0 -17 L6 4 L0 0 L-6 4 Z" fill={beobachtung.farbe} stroke="currentColor" strokeWidth="1" />
                  </g>
                </svg>
                <span className="text-2xl font-semibold tabular-nums">
                  {kompassGrad !== null ? richtungAnzeige(kompassGrad) : "…"}
                </span>
                <Button type="button" className="px-3 py-1.5" onClick={onPeilUebernehmen} disabled={kompassGrad === null}>
                  Richtung übernehmen
                </Button>
                <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={onPeilAbbrechen}>
                  Abbrechen
                </Button>
              </div>
            </div>
          )}

          {!peilt && richtung !== null && (
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={Math.round(richtung)}
              aria-label="Richtung fein einstellen"
              onChange={(event) => schieberAendern(Number(event.target.value))}
              className="w-full"
              style={{ accentColor: beobachtung.farbe }}
            />
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-gefahr hover:underline"
              onClick={async () => {
                if (await bestaetigen(`Hornisse „${beobachtung.markierung}“ mit allen Zeiten löschen?`, { gefahr: true })) {
                  startTransition(() => beobachtungLoeschen(beobachtung.id));
                }
              }}
            >
              Hornisse löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
