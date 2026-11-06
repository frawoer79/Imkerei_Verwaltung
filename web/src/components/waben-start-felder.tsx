"use client";

import { useEffect, useRef, useState } from "react";
import { ZahlStepper } from "@/components/zahl-stepper";
import { WABEN_START_ARTEN, wabenPlatz, type WabenStartFeld } from "@/lib/waben";
import type { ZargeAuswahl } from "@/lib/honig";

// Waben im Brutraum je Art (Brut, Futter, Leer, Mittelwände) - beim Anlegen
// eines Volkes Pflicht (mindestens eine Wabe), beim Bearbeiten zum
// Nachtragen oder Korrigieren. Die Obergrenze ist der Platz im Brutraum:
// Rähmchen je Zarge mal Zargenzahl aus der Brutraum-Auswahl im selben
// Formular (Zander einzargig 10, zweizargig 20). Ohne Brutraum gilt
// WABEN_OHNE_BRUTRAUM_MAX.
//
// Das versteckte Feld "wabenErfassen" sagt dem Server, dass die Werte gelten
// sollen: beim Anlegen immer, beim Bearbeiten erst, wenn mindestens eine
// Wabe eingetragen ist - sonst bleibt der bisherige Stand unberührt.
export function WabenStartFelder({
  brutraeume,
  werte = {},
  pflicht = false,
}: {
  brutraeume: ZargeAuswahl[];
  werte?: Partial<Record<WabenStartFeld, number | null>>;
  pflicht?: boolean;
}) {
  const rahmenRef = useRef<HTMLDivElement>(null);
  const [stand, setStand] = useState<Record<string, number>>(() =>
    Object.fromEntries(WABEN_START_ARTEN.map((art) => [art.feld, werte[art.feld] ?? 0]))
  );
  const [platz, setPlatz] = useState<number | null>(null);

  // Brutraum und Zargenzahl im selben Formular mitlesen.
  useEffect(() => {
    const formular = rahmenRef.current?.closest("form");
    if (!formular) return;
    const lesen = () => {
      const zargeId = (formular.elements.namedItem("brutraumZargeId") as HTMLSelectElement | null)?.value;
      const anzahl = Number(
        (formular.elements.namedItem("brutraumZargenAnzahl") as HTMLInputElement | null)?.value || 1
      );
      const zarge = brutraeume.find((eintrag) => eintrag.id === zargeId) ?? null;
      setPlatz(wabenPlatz(zarge, Number.isFinite(anzahl) ? anzahl : 1));
    };
    lesen();
    formular.addEventListener("input", lesen);
    formular.addEventListener("change", lesen);
    return () => {
      formular.removeEventListener("input", lesen);
      formular.removeEventListener("change", lesen);
    };
  }, [brutraeume]);

  const summe = Object.values(stand).reduce((a, b) => a + b, 0);
  const grenze = platz ?? wabenPlatz(null, 1);
  const zuViele = summe > grenze;

  return (
    <div ref={rahmenRef} className="flex flex-col gap-3">
      <input type="hidden" name="wabenErfassen" value={pflicht || summe > 0 ? "ja" : ""} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {WABEN_START_ARTEN.map((art) => (
          <ZahlStepper
            key={art.feld}
            name={art.feld}
            label={art.label}
            defaultValue={werte[art.feld]}
            min={0}
            max={Math.max(0, grenze - (summe - (stand[art.feld] ?? 0)))}
            beiAenderung={(wert) =>
              setStand((vorher) => (vorher[art.feld] === (wert ?? 0) ? vorher : { ...vorher, [art.feld]: wert ?? 0 }))
            }
          />
        ))}
      </div>
      <p className={`text-sm ${zuViele ? "text-gefahr" : "text-muted"}`}>
        Zusammen{" "}
        <span className="font-semibold tabular-nums text-foreground">{summe}</span> von {grenze} Waben im
        Brutraum
        {pflicht && summe === 0 && ". Mindestens eine Wabe eintragen."}
        {zuViele && ". Mehr, als in den Brutraum passen."}
      </p>
    </div>
  );
}
