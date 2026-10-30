"use client";

import { Input, Label, Select } from "@/components/ui";
import { EREIGNIS_ARTEN, EREIGNIS_LABEL, EREIGNIS_MIT_VOLK, type EreignisArt } from "@/lib/koeniginnen";

// Die Felder einer Lebenslauf-Station - identisch beim Eintragen und beim
// nachträglichen Bearbeiten. Das Volk wird nur bei den Ereignissen abgefragt,
// bei denen eins beteiligt ist - beim Verkauf oder Tod wäre die Auswahl
// sinnlos.
export function KoeniginEreignisFelder({
  idPraefix,
  art,
  onArtChange,
  datum,
  onDatumChange,
  volkId,
  onVolkIdChange,
  notiz,
  onNotizChange,
  voelker,
}: {
  idPraefix: string;
  art: EreignisArt;
  onArtChange: (wert: EreignisArt) => void;
  datum: string;
  onDatumChange: (wert: string) => void;
  volkId: string;
  onVolkIdChange: (wert: string) => void;
  notiz: string;
  onNotizChange: (wert: string) => void;
  voelker: { id: string; name: string; standName: string }[];
}) {
  const brauchtVolk = EREIGNIS_MIT_VOLK.includes(art);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPraefix}-art`}>Was ist passiert</Label>
          <Select
            id={`${idPraefix}-art`}
            value={art}
            onChange={(event) => onArtChange(event.target.value as EreignisArt)}
          >
            {EREIGNIS_ARTEN.map((wert) => (
              <option key={wert} value={wert}>
                {EREIGNIS_LABEL[wert]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${idPraefix}-datum`}>Datum</Label>
          <Input
            id={`${idPraefix}-datum`}
            type="date"
            value={datum}
            onChange={(event) => onDatumChange(event.target.value)}
            required
          />
        </div>
      </div>

      {brauchtVolk && (
        <div>
          <Label htmlFor={`${idPraefix}-volk`}>Volk</Label>
          <Select
            id={`${idPraefix}-volk`}
            value={volkId}
            onChange={(event) => onVolkIdChange(event.target.value)}
          >
            {voelker.map((volk) => (
              <option key={volk.id} value={volk.id}>
                {volk.name} ({volk.standName})
              </option>
            ))}
          </Select>
          {art === "ZUGESETZT" && (
            <p className="mt-1 text-xs text-muted">
              Sitzt dort schon eine Königin, wird sie entnommen und landet in der Reserve.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor={`${idPraefix}-notiz`}>Bemerkung</Label>
        <Input
          id={`${idPraefix}-notiz`}
          value={notiz}
          onChange={(event) => onNotizChange(event.target.value)}
          placeholder={art === "VERKAUFT" ? "an wen, zu welchem Preis" : ""}
        />
      </div>
    </>
  );
}
