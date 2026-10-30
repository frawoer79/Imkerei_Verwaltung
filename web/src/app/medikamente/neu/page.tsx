import { medikamentAnlegen } from "@/lib/actions";
import { Card, Label } from "@/components/ui";
import { FormularFehler, SicheresFormular, SpeichernKnopf } from "@/components/sicheres-formular";
import { MedikamentFelder } from "@/components/medikament-felder";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";
import { medikamentVorlage } from "@/lib/medikament-vorlagen";
import { MedikamentVorlageAuswahl } from "@/components/medikament-vorlage-auswahl";

export default async function MedikamentNeuPage({
  searchParams,
}: {
  searchParams: Promise<{ vorlage?: string }>;
}) {
  await bereichPflicht("behandlungen");
  const vorlage = medikamentVorlage((await searchParams).vorlage);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: "/medikamente", label: "Medikamente" }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Medikament anlegen</h1>
      </div>

      <Card>
        <SicheresFormular
          key={vorlage?.schluessel ?? "ohne"}
          action={medikamentAnlegen}
          className="flex flex-col gap-4"
        >
          <MedikamentVorlageAuswahl aktuell={vorlage?.schluessel} />
          {vorlage && (
            <>
              <input type="hidden" name="vorlage" value={vorlage.schluessel} />
              <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted">
                Stammdaten aus der Vorlage, bitte mit der Packung abgleichen.
                {!vorlage.zulassungsnummer && " Die Zulassungsnummer steht auf der Packung."}{" "}
                Trag unten die Angaben zu deiner Packung ein.
              </p>
            </>
          )}
          <MedikamentFelder
            erwerbPflicht={Boolean(vorlage)}
            werte={
              vorlage && {
                name: vorlage.name,
                wirkstoff: vorlage.wirkstoff,
                zulassungsnummer: vorlage.zulassungsnummer,
                einheit: vorlage.einheit,
                wartezeitTage: vorlage.wartezeitTage,
                notizen: vorlage.hinweis,
              }
            }
          />

          <div>
            <Label htmlFor="belege">Belege (Rechnung, Lieferschein, Verschreibung)</Label>
            <input
              id="belege"
              name="belege"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              Foto oder PDF. Erwerbsbelege sind fünf Jahre aufzubewahren und auf Verlangen
              vorzulegen.
            </p>
          </div>

          <FormularFehler />
          <div>
            <SpeichernKnopf>Medikament speichern</SpeichernKnopf>
          </div>
        </SicheresFormular>
      </Card>
    </div>
  );
}
