"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import { KoeniginEreignisFelder } from "@/components/koenigin-ereignis-felder";
import { EREIGNIS_MIT_VOLK, type EreignisArt } from "@/lib/koeniginnen";

// Bearbeitungsform eines bestehenden Lebenslauf-Eintrags - wird an Ort und
// Stelle in der Liste eingeblendet, statt auf eine eigene Seite zu springen.
// Erscheint erst nach Antippen von "Bearbeiten" (siehe KoeniginEreignisListe):
// die Liste selbst bleibt bis dahin nur lesbar.
export function KoeniginEreignisBearbeitenFormular({
  ereignis,
  voelker,
  action,
  fertig,
}: {
  ereignis: {
    id: string;
    art: EreignisArt;
    datum: string;
    volkId: string | null;
    notiz: string;
    fotoUrl: string | null;
  };
  voelker: { id: string; name: string; standName: string }[];
  action: (ereignisId: string, formData: FormData) => Promise<void>;
  fertig: () => void;
}) {
  const [art, setArt] = useState<EreignisArt>(ereignis.art);
  const [datum, setDatum] = useState(ereignis.datum);
  const [volkId, setVolkId] = useState(ereignis.volkId ?? voelker[0]?.id ?? "");
  const [notiz, setNotiz] = useState(ereignis.notiz);
  const [laeuft, setLaeuft] = useState(false);

  const brauchtVolk = EREIGNIS_MIT_VOLK.includes(art);

  async function speichern(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaeuft(true);
    try {
      const daten = new FormData(event.currentTarget);
      daten.set("art", art);
      daten.set("datum", datum);
      if (brauchtVolk) daten.set("volkId", volkId);
      else daten.delete("volkId");
      daten.set("notiz", notiz);
      await action(ereignis.id, daten);
      fertig();
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={speichern} className="flex flex-1 flex-col gap-3 rounded-md border border-accent/50 bg-background p-3">
      <KoeniginEreignisFelder
        idPraefix={`ereignis-bearbeiten-${ereignis.id}`}
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

      <EinzelfotoAuswahl name="foto" label="Foto" bestehendeUrl={ereignis.fotoUrl} entfernenName="fotoEntfernen" />

      <div className="flex gap-2">
        <Button type="submit" disabled={laeuft || (brauchtVolk && volkId === "")}>
          {laeuft ? "Wird gespeichert …" : "Speichern"}
        </Button>
        <Button type="button" variant="secondary" onClick={fertig} disabled={laeuft}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
