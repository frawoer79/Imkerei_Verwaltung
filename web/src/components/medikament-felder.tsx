import { Input, Label, Select, Textarea } from "@/components/ui";
import { DOSIS_EINHEITEN } from "@/lib/behandlung";
import { LAENGE } from "@/lib/eingabe-grenzen";

export type MedikamentDefaults = {
  name?: string | null;
  wirkstoff?: string | null;
  zulassungsnummer?: string | null;
  einheit?: string | null;
  wartezeitTage?: number | null;
  lieferant?: string | null;
  kaufdatum?: Date | null;
  belegnummer?: string | null;
  chargennummer?: string | null;
  verfallsdatum?: Date | null;
  notizen?: string | null;
};

function alsDatumWert(datum: Date | null | undefined): string {
  if (!datum) return "";
  const zweistellig = (zahl: number) => zahl.toString().padStart(2, "0");
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

// Stammdaten einer gekauften Packung. Oben die Angaben, die später in den
// Behandlungsnachweis wandern, unten der Erwerbsnachweis nach § 1 Abs. 2
// THAMNV (Lieferant, Art und Menge, Beleg).
// Mit `erwerbPflicht` (Medikament aus einer Vorlage) sind zusätzlich Kaufdatum
// und Charge Pflicht - die Stammdaten kommen aus der Vorlage, die Angaben zur
// eigenen Packung muss man selbst eintragen.
export function MedikamentFelder({
  werte = {},
  erwerbPflicht = false,
}: {
  werte?: MedikamentDefaults;
  erwerbPflicht?: boolean;
}) {
  return (
    <>
      <div>
        <Label htmlFor="name">Handelsname</Label>
        <Input
          id="name"
          name="name"
          maxLength={LAENGE.medikament}
          defaultValue={werte.name ?? ""}
          placeholder="z.B. Ameisensäure ad us. vet. 60 %"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Genau wie auf der Packung. So steht es später im Nachweis.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="wirkstoff">Wirkstoff</Label>
          <Input
            id="wirkstoff"
            name="wirkstoff"
            defaultValue={werte.wirkstoff ?? ""}
            placeholder="z.B. Ameisensäure"
          />
        </div>
        <div>
          <Label htmlFor="zulassungsnummer">Zulassungsnummer</Label>
          <Input
            id="zulassungsnummer"
            name="zulassungsnummer"
            defaultValue={werte.zulassungsnummer ?? ""}
            placeholder="z.B. 401324.00.00"
          />
          <p className="mt-1 text-xs text-muted">
            Nur zugelassene Tierarzneimittel dürfen angewendet werden.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="einheit">Einheit der Dosierung</Label>
          <Select id="einheit" name="einheit" defaultValue={werte.einheit ?? "ml"}>
            {DOSIS_EINHEITEN.map((einheit) => (
              <option key={einheit} value={einheit}>
                {einheit}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="wartezeitTage">Wartezeit (Tage)</Label>
          <Input
            id="wartezeitTage"
            name="wartezeitTage"
            type="number"
            min="0"
            step="1"
            defaultValue={werte.wartezeitTage ?? 0}
          />
          <p className="mt-1 text-xs text-muted">
            Wird bei jeder Behandlung vorgeschlagen, dort noch änderbar.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Erwerbsnachweis
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="lieferant">Lieferant: Name und Anschrift (Pflicht)</Label>
            <Input
              id="lieferant"
              name="lieferant"
              defaultValue={werte.lieferant ?? ""}
              placeholder="z.B. Imkerei-Fachhandel Müller, 12345 Musterstadt"
              aria-required="true"
              aria-describedby="lieferant-hinweis"
            />
            <p id="lieferant-hinweis" className="mt-1 text-xs text-muted">
              Apotheke, Fachhandel oder verschreibender Tierarzt, mit Anschrift.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="kaufdatum">Kaufdatum{erwerbPflicht && " (Pflicht)"}</Label>
              <Input
                id="kaufdatum"
                name="kaufdatum"
                type="date"
                defaultValue={alsDatumWert(werte.kaufdatum)}
                required={erwerbPflicht}
              />
            </div>
            <div>
              <Label htmlFor="belegnummer">Belegnummer (Pflicht)</Label>
              <Input
                id="belegnummer"
                name="belegnummer"
                defaultValue={werte.belegnummer ?? ""}
                placeholder="Rechnungs- oder Verschreibungsnummer"
                aria-required="true"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="chargennummer">Chargennummer{erwerbPflicht && " (Pflicht)"}</Label>
              <Input
                id="chargennummer"
                name="chargennummer"
                defaultValue={werte.chargennummer ?? ""}
                placeholder="steht auf dem Gebinde"
                required={erwerbPflicht}
              />
            </div>
            <div>
              <Label htmlFor="verfallsdatum">Verfallsdatum</Label>
              <Input
                id="verfallsdatum"
                name="verfallsdatum"
                type="date"
                defaultValue={alsDatumWert(werte.verfallsdatum)}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notizen">Notizen</Label>
        <Textarea id="notizen" name="notizen" rows={2} defaultValue={werte.notizen ?? ""} />
      </div>
    </>
  );
}
