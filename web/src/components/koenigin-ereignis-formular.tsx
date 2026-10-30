"use client";

import { heuteAlsInputWert } from "@/lib/datum";
import { useState } from "react";
import { Button } from "@/components/ui";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import { KoeniginEreignisFelder } from "@/components/koenigin-ereignis-felder";
import { EREIGNIS_MIT_VOLK, type EreignisArt } from "@/lib/koeniginnen";

// Eine Station im Lebenslauf eintragen.
//
// Bewusst kein <form action={...}>: React setzt das Formular nach der
// Server-Aktion zurück, was bei den Auswahlfeldern den zuletzt gewählten Wert
// wieder anzeigen würde, obwohl schon der neue gespeichert ist. Deshalb wird
// es von Hand ausgelesen und die Aktion direkt gerufen.
export function KoeniginEreignisFormular({
  koeniginId,
  voelker,
  action,
}: {
  koeniginId: string;
  voelker: { id: string; name: string; standName: string }[];
  action: (koeniginId: string, formData: FormData) => Promise<void>;
}) {
  const heute = heuteAlsInputWert();
  const [art, setArt] = useState<EreignisArt>("ZUGESETZT");
  const [datum, setDatum] = useState(heute);
  const [volkId, setVolkId] = useState(voelker[0]?.id ?? "");
  const [notiz, setNotiz] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  // Damit die Foto-Auswahl nach dem Eintragen wieder leer ist: neuer Schlüssel
  // baut sie frisch auf, statt die ausgewählte Datei stehen zu lassen.
  const [formularSchluessel, setFormularSchluessel] = useState(0);

  const brauchtVolk = EREIGNIS_MIT_VOLK.includes(art);

  async function speichern(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaeuft(true);
    try {
      // Das Formular selbst auslesen, damit die gewählte Datei mitkommt - die
      // übrigen Felder werden darüber gelegt, weil sie im Zustand liegen.
      const daten = new FormData(event.currentTarget);
      daten.set("art", art);
      daten.set("datum", datum);
      if (brauchtVolk) daten.set("volkId", volkId);
      else daten.delete("volkId");
      if (notiz.trim() !== "") daten.set("notiz", notiz);
      await action(koeniginId, daten);
      setNotiz("");
      setFormularSchluessel((wert) => wert + 1);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern} className="flex flex-col gap-3">
      <KoeniginEreignisFelder
        idPraefix="ereignis-neu"
        art={art}
        onArtChange={setArt}
        datum={datum}
        onDatumChange={setDatum}
        volkId={volkId}
        onVolkIdChange={setVolkId}
        notiz={notiz}
        onNotizChange={setNotiz}
        voelker={voelker}
      />

      <div key={formularSchluessel}>
        <EinzelfotoAuswahl name="foto" label="Foto (optional)" />
      </div>

      <div>
        <Button type="submit" disabled={laeuft || (brauchtVolk && volkId === "")}>
          {laeuft ? "Wird eingetragen …" : "Eintragen"}
        </Button>
      </div>
    </form>
  );
}
