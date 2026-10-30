"use client";

import { Input, Label, WahlChip } from "@/components/ui";
import { gebindeNameVoll, groesseKurz, HONIG_GROESSEN, type GebindeArt } from "@/lib/gebinde";

// Einfache Umriss-Symbole je Gebindeart - am Namen erkannt, damit eigene
// Gebinde ("Glas 30 g", "Eimer 5 kg") automatisch das passende bekommen.
export function GebindeSymbol({ name, className = "h-5 w-5" }: { name: string | null; className?: string }) {
  const gemeinsam = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  // Ohne Gebinde ("Gewicht"): Gewichtsstück, damit es nicht wie ein Honigtropfen aussieht.
  if (!name) {
    return (
      <svg {...gemeinsam}>
        <path d="M9 7.5a3 3 0 1 1 6 0" />
        <path d="M8.5 7.5h7l3.5 12.5H5z" />
        <path d="M10 14h4" />
      </svg>
    );
  }
  if (/glas/i.test(name)) {
    return (
      <svg {...gemeinsam}>
        <rect x="7" y="3" width="10" height="3" rx="1" />
        <path d="M6.5 6h11v13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z" />
        <path d="M6.5 11h11" />
      </svg>
    );
  }
  if (/hobbock/i.test(name)) {
    return (
      <svg {...gemeinsam}>
        <rect x="4.5" y="5" width="15" height="16" rx="1.5" />
        <path d="M4.5 9h15M9 3h6" />
      </svg>
    );
  }
  return (
    <svg {...gemeinsam}>
      <path d="M5 7h14l-1.6 13H6.6z" />
      <path d="M5 7c0-3 14-3 14 0" />
    </svg>
  );
}

// Felder für eine neue Größe ("+ Größe"): übliche Größen zum Antippen, dazu
// Name und Inhalt. Derselbe Baustein im Einlagern-Fenster und unter
// Einstellungen -> Lager, damit eine Größe an beiden Stellen gleich entsteht.
// Abgeschickt werden `neuesGebinde` (voller Name, z.B. "Glas 400 g"),
// `neuesGebindeInhalt` und `gebindeArt`; der Server prüft auf Doppelte.
export function GebindeNeuFelder({
  idPrefix,
  art,
  honig,
  einheit,
  vorhandene,
  name,
  setName,
  inhalt,
  setInhalt,
  autoFocus = false,
}: {
  idPrefix: string;
  art: GebindeArt;
  honig: boolean;
  einheit: string;
  vorhandene: { name: string; inhalt: number }[];
  name: string;
  setName: (name: string) => void;
  inhalt: string;
  setInhalt: (inhalt: string) => void;
  autoFocus?: boolean;
}) {
  const vorhandeneInhalte = new Set(vorhandene.map((eintrag) => eintrag.inhalt));
  const vorschlaege =
    honig && art !== "sonst" ? HONIG_GROESSEN[art].filter((vorschlag) => !vorhandeneInhalte.has(vorschlag.inhalt)) : [];
  const voll = gebindeNameVoll(name, art, honig);

  return (
    <div className="flex flex-col gap-2">
      {vorschlaege.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">Übliche Größen</p>
          <div className="flex flex-wrap gap-2">
            {vorschlaege.map((vorschlag) => (
              <WahlChip
                key={vorschlag.name}
                gruppe={`${idPrefix}-groesse-vorschlag`}
                aktiv={name === vorschlag.name}
                onWahl={() => {
                  setName(vorschlag.name);
                  setInhalt(String(vorschlag.inhalt));
                }}
              >
                {groesseKurz(vorschlag.name)}
              </WahlChip>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <div className="min-w-36 flex-1">
          <Label htmlFor={`${idPrefix}-neues-gebinde`}>{honig && art !== "sonst" ? "Größe" : "Name des Gebindes"}</Label>
          <input type="hidden" name="neuesGebinde" value={voll} />
          <input type="hidden" name="gebindeArt" value={art} />
          <Input
            id={`${idPrefix}-neues-gebinde`}
            placeholder={art === "eimer" ? "z.B. 5 kg" : art === "glas" ? "z.B. 400 g" : "z.B. Kiste 10 Stück"}
            required
            autoFocus={autoFocus}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="w-28">
          <Label htmlFor={`${idPrefix}-neues-gebinde-inhalt`}>Inhalt ({einheit})</Label>
          <Input
            id={`${idPrefix}-neues-gebinde-inhalt`}
            name="neuesGebindeInhalt"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            required
            value={inhalt}
            onChange={(event) => setInhalt(event.target.value)}
          />
        </div>
      </div>
      {voll && voll !== name.trim() && <p className="text-xs text-muted">Wird als „{voll}“ gespeichert.</p>}
    </div>
  );
}
