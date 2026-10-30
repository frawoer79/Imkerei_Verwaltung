import { prisma } from "@/lib/prisma";
import { betriebSpeichern } from "@/lib/actions";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { TelefonFeld } from "@/components/telefon-feld";
import { MENUE_NAME_STANDARD } from "@/lib/menue-name";

// Halteranschrift und Betriebsdaten. Stehen bewusst in der Datenbank und nicht
// im Quelltext: sie gehören in den Kopf jedes Behandlungsnachweises (§ 2
// THAMNV) und sollen ohne Deployment änderbar sein.
// Steht auf /einstellungen/bienenhalter und am PC auch gleich auf /einstellungen.
export async function BienenhalterInhalt({ kopf }: { kopf?: React.ReactNode }) {
  const betrieb = await prisma.betrieb.findUnique({ where: { id: "standard" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        {kopf}
        <h1 className="text-2xl font-semibold tracking-tight">Bienenhalter</h1>
        <p className="text-sm text-muted">
          Angaben zum Imkereibetrieb. Sie erscheinen im Kopf des Behandlungsnachweises.
        </p>
      </div>

      <Card>
        <p className="mb-4 text-sm text-muted">
          Name und Anschrift gehören ins Bestandsbuch. Ohne sie ist der Nachweis unvollständig.
        </p>

        <form action={betriebSpeichern} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="halterName">Name des Bienenhalters</Label>
            <Input
              id="halterName"
              name="halterName"
              defaultValue={betrieb?.halterName ?? ""}
              placeholder="Vor- und Nachname"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="strasse">Straße und Hausnummer</Label>
              <Input
                id="strasse"
                name="strasse"
                defaultValue={betrieb?.strasse ?? ""}
                placeholder="z.B. Musterweg 3"
              />
            </div>
            <div>
              <Label htmlFor="plzOrt">PLZ und Ort</Label>
              <Input
                id="plzOrt"
                name="plzOrt"
                defaultValue={betrieb?.plzOrt ?? ""}
                placeholder="z.B. 12345 Musterstadt"
              />
            </div>
          </div>

          <div className="sm:w-1/2 sm:pr-1.5">
            <Label htmlFor="bundesland">Bundesland</Label>
            <Select id="bundesland" name="bundesland" defaultValue={betrieb?.bundesland ?? ""}>
              <option value="">– nicht angegeben –</option>
              {BUNDESLAENDER.map((land) => (
                <option key={land.kuerzel} value={land.kuerzel}>
                  {land.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              Die Velutina-Karte mit den LUBW-Meldungen gibt es nur für Baden-Württemberg.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="telefon">Telefon (optional)</Label>
              <TelefonFeld id="telefon" name="telefon" defaultValue={betrieb?.telefon ?? ""} />
            </div>
            <div>
              <Label htmlFor="email">E-Mail (optional)</Label>
              <Input id="email" name="email" type="email" defaultValue={betrieb?.email ?? ""} />
            </div>
          </div>

          <div>
            <Label htmlFor="registriernummer">Registriernummer (optional)</Label>
            <Input
              id="registriernummer"
              name="registriernummer"
              defaultValue={betrieb?.registriernummer ?? ""}
              placeholder="z.B. Betriebsnummer beim Veterinäramt"
            />
          </div>

          <div>
            <Label htmlFor="menueName">Name im Menü (optional)</Label>
            <Input
              id="menueName"
              name="menueName"
              defaultValue={betrieb?.menueName ?? ""}
              placeholder={MENUE_NAME_STANDARD}
            />
            <p className="mt-1 text-xs text-muted">
              Steht oben im Menü neben dem Logo. Leer lassen für „{MENUE_NAME_STANDARD}“.
            </p>
          </div>

          <div>
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
