import { bienenstandAnlegen } from "@/lib/actions";
import { Card, Label, Input, Textarea } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import { StandortKarte } from "@/components/standort-karte";
import { EinzelfotoAuswahl } from "@/components/einzelfoto-auswahl";
import { StandtypAuswahl } from "@/components/standtyp";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default function NeuerBienenstandPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Neuer Bienenstand</h1>
      </div>

      <Card>
        <SicheresFormular action={bienenstandAnlegen} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="z.B. Garten Zuhause" />
          </div>
          <StandtypAuswahl />
          <StandortKarte
            initialStrasse=""
            initialOrt=""
            initialBreitengrad={null}
            initialLaengengrad={null}
          />
          <div>
            <Label htmlFor="notizen">Notizen</Label>
            <Textarea id="notizen" name="notizen" rows={3} />
          </div>
          <EinzelfotoAuswahl name="standortFoto" label="Foto des Standorts (optional)" />
          <FormularFehler />
          <div>
            <SpeichernKnopf>Anlegen</SpeichernKnopf>
          </div>
        </SicheresFormular>
      </Card>
    </div>
  );
}
