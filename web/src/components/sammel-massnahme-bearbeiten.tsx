"use client";

import { useState } from "react";
import { massnahmenLoeschen, sammelMassnahmeAktualisieren } from "@/lib/actions";
import { bestaetigen } from "@/lib/bestaetigen";
import { Button, EntfernChip, Input, Label, PlusChip } from "@/components/ui";
import { alsDatumWert } from "@/components/massnahme-felder";

export type VolkWahlStand = { id: string; name: string; voelker: { id: string; name: string }[] };

const NATUERLICH = new Intl.Collator("de", { numeric: true });

type Mitglied = { id: string; volkId: string; volkName: string; bienenstandName: string };

// Eine Sammelmaßnahme als Ganzes bearbeiten (Franks Wahl, Entwurf B vom
// 31.10.2026): ein Formular für alle Völker statt eines je Volk. Text und
// Termin gelten für alle, die Völker stehen als Chips darunter, ✕ nimmt
// eines heraus, "+ Volk" ergänzt eines. Gespeichert wird erst mit dem Knopf.
export function SammelMassnahmeBearbeiten({
  massnahmen,
  staende,
  fertig,
}: {
  /// Die offenen Völker der Gruppe.
  massnahmen: (Mitglied & { text: string; faelligAm: Date | null })[];
  /// Alle Stände mit Völkern für "+ Volk". Ohne Liste gibt es kein Ergänzen.
  staende?: VolkWahlStand[];
  fertig: () => void;
}) {
  const erste = massnahmen[0]!;
  const [voelker, setVoelker] = useState<{ id: string; name: string; stand: string }[]>(() =>
    massnahmen
      .map((massnahme) => ({ id: massnahme.volkId, name: massnahme.volkName, stand: massnahme.bienenstandName }))
      .sort((a, b) => NATUERLICH.compare(`${a.stand} ${a.name}`, `${b.stand} ${b.name}`))
  );
  const [auswahlOffen, setAuswahlOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const mehrereStaende = new Set(voelker.map((volk) => volk.stand)).size > 1;
  const gewaehlt = new Set(voelker.map((volk) => volk.id));
  const entfernt = massnahmen.filter((massnahme) => !gewaehlt.has(massnahme.volkId));
  const wahlStaende = (staende ?? [])
    .map((stand) => ({ ...stand, voelker: stand.voelker.filter((volk) => !gewaehlt.has(volk.id)) }))
    .filter((stand) => stand.voelker.length > 0);

  async function speichern(formData: FormData) {
    if (voelker.length === 0) {
      setFehler("Mindestens ein Volk muss bleiben. Zum Löschen den Knopf unten nehmen.");
      return;
    }
    if (entfernt.length > 0) {
      const namen = entfernt.map((massnahme) => massnahme.volkName).join(", ");
      const ja = await bestaetigen(
        `${entfernt.length === 1 ? `${namen} wird` : `${namen} werden`} aus der Maßnahme genommen. Die Maßnahme ist dort dann gelöscht.`,
        { ja: "Herausnehmen", gefahr: true }
      );
      if (!ja) return;
    }
    setSpeichert(true);
    setFehler(null);
    for (const volk of voelker) formData.append("volkIds", volk.id);
    try {
      const antwort = await sammelMassnahmeAktualisieren(erste.id, formData);
      if (antwort.fehler) setFehler(antwort.fehler);
      else fertig();
    } finally {
      setSpeichert(false);
    }
  }

  async function alleLoeschen() {
    const ja = await bestaetigen(`Die Maßnahme für alle ${massnahmen.length} Völker löschen?`, {
      ja: "Löschen",
      gefahr: true,
    });
    if (!ja) return;
    setSpeichert(true);
    try {
      await massnahmenLoeschen(massnahmen.map((massnahme) => massnahme.id));
      fertig();
    } finally {
      setSpeichert(false);
    }
  }

  const praefix = `sammel-${erste.id}`;
  return (
    <form action={speichern} className="flex flex-col gap-3 p-3 sm:pl-9">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:flex-[2]">
          <Label htmlFor={`${praefix}-text`}>Maßnahme</Label>
          <Input id={`${praefix}-text`} name="text" defaultValue={erste.text} required className="min-h-11" />
        </div>
        <div className="sm:w-48">
          <Label htmlFor={`${praefix}-faellig`}>Fällig am</Label>
          <Input
            id={`${praefix}-faellig`}
            name="faelligAm"
            type="date"
            defaultValue={alsDatumWert(erste.faelligAm)}
            className="min-h-11"
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Völker</p>
        <div className="flex flex-wrap gap-1.5">
          {voelker.map((volk) => (
            <EntfernChip
              key={volk.id}
              beschriftung={`${volk.name} herausnehmen`}
              onEntfernen={() => setVoelker(voelker.filter((eintrag) => eintrag.id !== volk.id))}
            >
              {mehrereStaende ? `${volk.stand} · ${volk.name}` : volk.name}
            </EntfernChip>
          ))}
          {wahlStaende.length > 0 && (
            <PlusChip onClick={() => setAuswahlOffen(!auswahlOffen)}>{auswahlOffen ? "Fertig" : "+ Volk"}</PlusChip>
          )}
        </div>
        {auswahlOffen && (
          <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-background p-2">
            {wahlStaende.map((stand) => (
              <div key={stand.id} className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{stand.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {stand.voelker.map((volk) => (
                    <PlusChip
                      key={volk.id}
                      onClick={() => setVoelker([...voelker, { id: volk.id, name: volk.name, stand: stand.name }])}
                    >
                      + {volk.name}
                    </PlusChip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fehler && <p className="text-sm text-gefahr">{fehler}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" groesse="mittel" disabled={speichert || voelker.length === 0} className="flex-1 sm:flex-none">
          Für {voelker.length} {voelker.length === 1 ? "Volk" : "Völker"} speichern
        </Button>
        <Button type="button" variant="secondary" groesse="mittel" onClick={fertig}>
          Abbrechen
        </Button>
        <Button
          type="button"
          variant="leiseGefahr"
          groesse="mittel"
          disabled={speichert}
          onClick={() => void alleLoeschen()}
          className="w-full sm:ml-auto sm:w-auto"
        >
          Für alle {massnahmen.length} Völker löschen
        </Button>
      </div>
    </form>
  );
}
