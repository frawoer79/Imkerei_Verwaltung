import { notFound } from "next/navigation";
import { zuchtkarteEntfernen, zuchtkarteSpeichern } from "@/lib/actions";
import { LoeschenButton } from "@/components/loeschen-button";
import { ZuchtkarteEditor } from "@/components/zuchtkarte-editor";
import { standAnzeige, zuchtkarteLaden, zuchtkarteVorschlagLaden } from "@/lib/zuchtkarte-daten";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

// Zuchtkarte erstellen bzw. - wenn es sie schon gibt - bearbeiten. Beim
// Erstellen ist alles aus den Daten der Königin vorbelegt; beim Bearbeiten
// steht die gespeicherte Karte da, der frische Vorschlag aus den Daten dient
// nur dazu, die Bewertung bei Bedarf neu zu übernehmen.
export default async function ZuchtkarteBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  await bereichPflicht("koeniginnen");
  const { id } = await params;

  const [vorschlag, gespeichert] = await Promise.all([zuchtkarteVorschlagLaden(id), zuchtkarteLaden(id)]);
  if (!vorschlag) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation pfad={[{ href: `/koeniginnen/${id}`, label: vorschlag.kennung }]} className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {gespeichert ? "Zuchtkarte bearbeiten" : "Zuchtkarte erstellen"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {gespeichert
            ? "Die Karte, wie sie gespeichert ist. Ändere direkt auf der Karte, was sich geändert hat, z.B. die Bewertung."
            : "Alles, was zu dieser Königin bekannt ist, steht schon auf der Karte. Prüfe es und ändere direkt auf der Karte, was nicht stimmt oder fehlt."}
        </p>
      </div>

      <ZuchtkarteEditor
        startInhalt={gespeichert ? gespeichert.inhalt : vorschlag.inhalt}
        vorschlag={vorschlag.inhalt}
        bestehend={gespeichert !== null}
        stand={standAnzeige(new Date())}
        speichernAction={zuchtkarteSpeichern.bind(null, id)}
        abbrechenHref={`/koeniginnen/${id}`}
        entfernenSlot={
          gespeichert ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">
                Entfernt nur die Karte, nicht die Königin. Beim nächsten Erstellen wird wieder aus ihren Daten
                vorbelegt.
              </p>
              <LoeschenButton
                action={zuchtkarteEntfernen.bind(null, id)}
                bestaetigung="Die Zuchtkarte wirklich entfernen? Die Daten der Königin bleiben erhalten."
              >
                Zuchtkarte entfernen
              </LoeschenButton>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
