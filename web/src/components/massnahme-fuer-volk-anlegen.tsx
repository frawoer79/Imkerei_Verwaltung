"use client";

import { useMemo, useState } from "react";
import { MassnahmeSendenFormular } from "@/components/massnahme-senden-formular";
import { Button } from "@/components/ui";
import { MassnahmeFelder } from "@/components/massnahme-felder";

type Stand = { id: string; name: string; voelker: { id: string; name: string }[] };
type Umfang = "einzeln" | "stand" | "alle";

const UMFANG_OPTIONEN: { wert: Umfang; label: string }[] = [
  { wert: "einzeln", label: "Einzelne Völker" },
  { wert: "stand", label: "Ganzer Stand" },
  { wert: "alle", label: "Alle Stände" },
];

// Erst den Umfang festlegen (einzelne Völker, ein ganzer Stand oder alle
// Stände), danach zeigt sich nur die dazu passende, kleine Auswahl - statt
// immer die komplette Völkerliste auf einmal. Beim Absenden entsteht für
// jedes zum aktuellen Umfang gehörende Volk eine eigene, versteckte
// "volkIds"-Angabe; der Server legt dann für jedes davon eine eigene
// Maßnahme an. Gesendet wird über die Warteschlange (MassnahmeSendenFormular).
export function MassnahmeFuerVoelkerAnlegen({ staende }: { staende: Stand[] }) {
  const [umfang, setUmfang] = useState<Umfang>("einzeln");
  const [gewaehlteVoelker, setGewaehlteVoelker] = useState<Set<string>>(() => new Set());
  const [gewaehlteStaende, setGewaehlteStaende] = useState<Set<string>>(() => new Set());

  const alleVolkIds = useMemo(
    () => staende.flatMap((stand) => stand.voelker.map((volk) => volk.id)),
    [staende]
  );

  const aktuelleVolkIds = useMemo(() => {
    if (umfang === "alle") return alleVolkIds;
    if (umfang === "stand") {
      return staende
        .filter((stand) => gewaehlteStaende.has(stand.id))
        .flatMap((stand) => stand.voelker.map((volk) => volk.id));
    }
    return Array.from(gewaehlteVoelker);
  }, [umfang, alleVolkIds, staende, gewaehlteStaende, gewaehlteVoelker]);

  if (staende.length === 0) {
    return (
      <p className="text-sm text-muted">
        Es gibt noch keinen Bienenstand mit Volk (archivierte zählen nicht).
      </p>
    );
  }

  function volkUmschalten(volkId: string) {
    setGewaehlteVoelker((vorher) => {
      const neu = new Set(vorher);
      if (neu.has(volkId)) neu.delete(volkId);
      else neu.add(volkId);
      return neu;
    });
  }

  function standUmschalten(standId: string) {
    setGewaehlteStaende((vorher) => {
      const neu = new Set(vorher);
      if (neu.has(standId)) neu.delete(standId);
      else neu.add(standId);
      return neu;
    });
  }

  return (
    <MassnahmeSendenFormular className="flex flex-col gap-4">
      {aktuelleVolkIds.map((volkId) => (
        <input key={volkId} type="hidden" name="volkIds" value={volkId} />
      ))}

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
          {UMFANG_OPTIONEN.map((option) => (
            <button
              key={option.wert}
              type="button"
              onClick={() => setUmfang(option.wert)}
              aria-pressed={umfang === option.wert}
              className={`rounded px-2 py-1.5 text-xs font-medium sm:text-sm ${
                umfang === option.wert ? "bg-accent text-accent-foreground" : "bg-card hover:bg-background"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {umfang === "einzeln" && (
          <div className="flex flex-col gap-3">
            {staende.map((stand) => (
              <div key={stand.id} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{stand.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {stand.voelker.map((volk) => (
                    <button
                      key={volk.id}
                      type="button"
                      onClick={() => volkUmschalten(volk.id)}
                      aria-pressed={gewaehlteVoelker.has(volk.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        gewaehlteVoelker.has(volk.id)
                          ? "border-accent bg-accent font-medium text-accent-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {volk.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {umfang === "stand" && (
          <div className="flex flex-col gap-1.5">
            {staende.map((stand) => (
              <button
                key={stand.id}
                type="button"
                onClick={() => standUmschalten(stand.id)}
                aria-pressed={gewaehlteStaende.has(stand.id)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                  gewaehlteStaende.has(stand.id) ? "border-accent bg-accent/10" : "border-border bg-background"
                }`}
              >
                <span className="font-medium">{stand.name}</span>
                <span className={gewaehlteStaende.has(stand.id) ? "text-xs text-accent" : "text-xs text-muted"}>
                  {stand.voelker.length} {stand.voelker.length === 1 ? "Volk" : "Völker"}
                </span>
              </button>
            ))}
          </div>
        )}

        {umfang === "alle" && (
          <p className="rounded-md border border-border bg-background p-3 text-sm text-muted">
            Wirkt auf <strong className="text-foreground">alle {alleVolkIds.length} Völker</strong> an{" "}
            <strong className="text-foreground">
              {staende.length} {staende.length === 1 ? "Stand" : "Ständen"}
            </strong>{" "}
            ({staende.map((stand) => stand.name).join(", ")}).
          </p>
        )}

        <p className="text-xs text-muted">
          {aktuelleVolkIds.length === 0
            ? "Kein Volk ausgewählt"
            : `${aktuelleVolkIds.length} ${aktuelleVolkIds.length === 1 ? "Volk" : "Völker"} ausgewählt`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <MassnahmeFelder idPraefix="neu" />
        <Button type="submit" disabled={aktuelleVolkIds.length === 0}>
          Anlegen
        </Button>
      </div>
    </MassnahmeSendenFormular>
  );
}
