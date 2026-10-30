"use client";

import { useState } from "react";
import { Label, Select, Input } from "@/components/ui";
import { ZEICHENFARBEN, aktuelleJahrgaenge, anzeigeFarbe, jahresfarbe } from "@/lib/koeniginnen";

type Art = "" | "farbe" | "blaettchen";

// Jahrgang und Kennzeichnung einer Königin - dieselbe Systematik an allen
// Stellen, an denen sie erfasst werden: Schnellfelder beim Anlegen/Bearbeiten
// eines Volkes (`koenigin-schnellangaben` mit vorangestellten Feldnamen, da
// dort neben Volk-Feldern im selben Formular) und das vollständige
// Königin-Formular (`jahrFeld`/`farbeFeld`/`nummerFeld` auf die eigenen,
// unpräfigierten Feldnamen der Königin gestellt). Jahrgang als Auswahl statt
// Zahlenfeld (die letzten sechs Jahrgänge decken praktisch jeden Fall ab),
// und die Kennzeichnung als "Art" (noch nicht gezeichnet / nur Farbe /
// Blättchen mit Nummer) statt eines einzelnen Freitextfelds.
export function KoeniginSchnellangaben({
  idPraefix = "",
  jahrFeld = "koeniginJahr",
  farbeFeld = "koeniginZeichenFarbe",
  nummerFeld = "koeniginZeichenNummer",
  jahrgang: jahrgangWert = null,
  zeichenFarbe: zeichenFarbeWert = null,
  zeichenNummer: zeichenNummerWert = null,
  mitVorschau = false,
}: {
  idPraefix?: string;
  jahrFeld?: string;
  farbeFeld?: string;
  nummerFeld?: string;
  jahrgang?: number | null;
  zeichenFarbe?: string | null;
  zeichenNummer?: string | null;
  /// Farbiger Kreis zur Vorschau - auf der vollständigen Königin-Seite ist
  /// dafür Platz, in den kompakten Volk-Dialogen bewusst aus.
  mitVorschau?: boolean;
}) {
  const [jahrgang, setJahrgang] = useState(jahrgangWert ? String(jahrgangWert) : "");
  const [art, setArt] = useState<Art>(zeichenNummerWert ? "blaettchen" : zeichenFarbeWert ? "farbe" : "");
  const [farbe, setFarbe] = useState(zeichenFarbeWert ?? "");

  // Jahrgang/Farbe der bestehenden Königin mit anbieten, auch wenn sie außerhalb
  // der sonst vorgeschlagenen Werte liegt (ältere Königin, alte Freitext-Farbe) -
  // sonst würde das Bearbeiten-Formular den vorhandenen Wert stillschweigend
  // durch einen anderen ersetzen.
  const jahrOptionen = Array.from(
    new Set([...(jahrgangWert ? [jahrgangWert] : []), ...aktuelleJahrgaenge()])
  ).sort((a, b) => b - a);
  const farbOptionen = zeichenFarbeWert && !ZEICHENFARBEN.includes(zeichenFarbeWert as (typeof ZEICHENFARBEN)[number])
    ? [zeichenFarbeWert, ...ZEICHENFARBEN]
    : ZEICHENFARBEN;

  const jahrgangZahl = jahrgang ? Number.parseInt(jahrgang, 10) : null;
  const vorschlag = jahresfarbe(jahrgangZahl);
  const farbeAnzeige = farbe || vorschlag?.name || farbOptionen[0];
  const vorschauFarbe = art !== "" ? anzeigeFarbe(jahrgangZahl, farbeAnzeige) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPraefix}${jahrFeld}`}>Königin Jahrgang</Label>
          <Select
            id={`${idPraefix}${jahrFeld}`}
            name={jahrFeld}
            value={jahrgang}
            onChange={(event) => setJahrgang(event.target.value)}
          >
            <option value="">— unbekannt —</option>
            {jahrOptionen.map((jahr) => (
              <option key={jahr} value={jahr}>
                {jahr}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${idPraefix}${farbeFeld}-art`}>Kennzeichnung</Label>
          <Select
            id={`${idPraefix}${farbeFeld}-art`}
            value={art}
            onChange={(event) => setArt(event.target.value as Art)}
          >
            <option value="">Noch nicht gezeichnet</option>
            <option value="farbe">Farbe</option>
            <option value="blaettchen">Blättchen (Farbe + Nummer)</option>
          </Select>
        </div>
      </div>
      {art !== "" && (
        <div className="flex items-center gap-3">
          {mitVorschau && (
            <span
              className="h-10 w-10 shrink-0 rounded-full border border-rand-bedienung"
              style={{ background: vorschauFarbe?.hex ?? "transparent" }}
              aria-hidden="true"
            />
          )}
          <div className="grid flex-1 grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${idPraefix}${farbeFeld}`}>Farbe</Label>
              <Select
                id={`${idPraefix}${farbeFeld}`}
                name={farbeFeld}
                value={farbeAnzeige}
                onChange={(event) => setFarbe(event.target.value)}
              >
                {farbOptionen.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
            {art === "blaettchen" && (
              <div>
                <Label htmlFor={`${idPraefix}${nummerFeld}`}>Nummer</Label>
                <Input
                  id={`${idPraefix}${nummerFeld}`}
                  name={nummerFeld}
                  defaultValue={zeichenNummerWert ?? ""}
                  placeholder="z.B. 14"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
