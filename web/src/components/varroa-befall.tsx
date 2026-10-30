"use client";

import { useEffect, useState } from "react";
import { Input, Label, Select } from "@/components/ui";
import { IconWarnung } from "@/components/icons";
import {
  BIENENPROBE_STANDARD_GRAMM,
  VARROA_ZAEHLWEISE_OPTIONEN,
  varroaAuswerten,
  varroaMethode,
} from "@/lib/varroa";

function zahlOderNull(text: string): number | null {
  const sauber = text.trim();
  if (sauber === "") return null;
  const zahl = Number(sauber);
  return Number.isFinite(zahl) ? zahl : null;
}

// Varroa-Befall erfassen und direkt bewerten: je nach Zählweise wird aus den
// gezählten Milben ein Befallsgrad (Milben/Tag beim Gemüll, Prozent bei einer
// Bienenprobe) berechnet und gegen die Schadschwelle der jeweiligen
// Jahreszeit gehalten - siehe lib/varroa.ts.
export function VarroaBefall({
  zaehlweise: zaehlweiseStandard,
  anzahl: anzahlStandard,
  gemuellTage: gemuellTageStandard,
  bienenprobeGramm: bienenprobeGrammStandard,
  datum,
}: {
  zaehlweise?: string | null;
  anzahl?: number | null;
  gemuellTage?: number | null;
  bienenprobeGramm?: number | null;
  datum?: Date | null;
}) {
  const [zaehlweise, setZaehlweise] = useState(zaehlweiseStandard ?? "");
  const [anzahl, setAnzahl] = useState(anzahlStandard?.toString() ?? "");
  const [tage, setTage] = useState(gemuellTageStandard?.toString() ?? "");
  const [gramm, setGramm] = useState(
    bienenprobeGrammStandard?.toString() ?? BIENENPROBE_STANDARD_GRAMM.toString()
  );
  // Die Schadschwelle hängt von der Jahreszeit ab, also vom Datum des
  // Eintrags. Das Datumsfeld gehört zum umgebenden Formular (eigene
  // Komponente), deshalb wird es hier direkt aus dem Formular gelesen und
  // bei Änderungen nachgezogen.
  const [datumText, setDatumText] = useState<string | null>(null);

  useEffect(() => {
    const feld = document.getElementById("datum");
    if (!(feld instanceof HTMLInputElement)) return;
    const uebernehmen = () => setDatumText(feld.value);
    uebernehmen();
    feld.addEventListener("change", uebernehmen);
    feld.addEventListener("input", uebernehmen);
    return () => {
      feld.removeEventListener("change", uebernehmen);
      feld.removeEventListener("input", uebernehmen);
    };
  }, []);

  const ausFormular = datumText ? new Date(datumText) : null;
  const stichtag =
    ausFormular && !Number.isNaN(ausFormular.getTime()) ? ausFormular : (datum ?? new Date());

  const methode = varroaMethode(zaehlweise);
  const auswertung = varroaAuswerten({
    zaehlweise,
    anzahl: zahlOderNull(anzahl),
    gemuellTage: zahlOderNull(tage),
    bienenprobeGramm: zahlOderNull(gramm),
    datum: stichtag,
  });

  return (
    <>
      <p className="text-xs text-muted">Befall dokumentieren</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="varroaZaehlweise">Zählweise</Label>
          <Select
            id="varroaZaehlweise"
            name="varroaZaehlweise"
            value={zaehlweise}
            onChange={(event) => setZaehlweise(event.target.value)}
          >
            <option value="">keine Auswahl</option>
            {VARROA_ZAEHLWEISE_OPTIONEN.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="varroaAnzahl">
            {methode === "gemuell" ? "Gefallene Milben" : "Gefundene Milben"}
          </Label>
          <Input
            id="varroaAnzahl"
            name="varroaAnzahl"
            type="number"
            min="0"
            step="1"
            value={anzahl}
            onChange={(event) => setAnzahl(event.target.value)}
          />
        </div>

        {methode === "gemuell" && (
          <div>
            <Label htmlFor="varroaGemuellTage">Tage auf der Bodeneinlage</Label>
            <Input
              id="varroaGemuellTage"
              name="varroaGemuellTage"
              type="number"
              min="1"
              step="1"
              value={tage}
              onChange={(event) => setTage(event.target.value)}
              placeholder="z.B. 3"
            />
          </div>
        )}

        {methode === "bienenprobe" && (
          <div>
            <Label htmlFor="varroaBienenprobeGramm">Bienenprobe (g)</Label>
            <Input
              id="varroaBienenprobeGramm"
              name="varroaBienenprobeGramm"
              type="number"
              min="1"
              step="1"
              value={gramm}
              onChange={(event) => setGramm(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              100-ml-Becher randvoll = ca. 50 g = ca. 500 Bienen
            </p>
          </div>
        )}
      </div>

      {auswertung && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            auswertung.schwelleErreicht
              ? "border-gefahr-rand bg-gefahr-flaeche text-gefahr"
              : "border-border bg-background"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-muted">Befallsgrad</span>
            <span className="text-lg font-semibold">
              {auswertung.anzeige}
              {auswertung.schwelleErreicht && (
                <>
                  {" "}
                  <IconWarnung className="inline-block h-[1em] w-[1em] align-[-0.125em]" />
                </>
              )}
            </span>
          </div>
          <p className={auswertung.schwelleErreicht ? "mt-1 font-medium" : "mt-1 text-muted"}>
            Schadschwelle {auswertung.zeitraum.label}: {auswertung.schwelleAnzeige}
            {auswertung.schwelleErreicht ? " (erreicht)" : " (noch nicht erreicht)"}
          </p>
          <p className="mt-1">
            {auswertung.schwelleErreicht
              ? auswertung.zeitraum.empfehlung
              : "Kein akuter Handlungsbedarf. Kontrolle im monatlichen Abstand fortsetzen."}
          </p>
        </div>
      )}
    </>
  );
}
