import { Card } from "@/components/ui";
import { StammbaumZweig } from "@/components/stammbaum";
import { nachkommenAnzahl, stammbaumLaden, stammmuetter } from "@/lib/stammbaum";
import { SeitenNavigation } from "@/components/seiten-navigation";
import { bereichPflicht } from "@/lib/bereiche";

export default async function StammbaumPage() {
  await bereichPflicht("koeniginnen");
  const baum = await stammbaumLaden();
  const linien = stammmuetter(baum)
    .map((koenigin) => ({ koenigin, nachkommen: nachkommenAnzahl(baum, koenigin.id) }))
    .sort((a, b) => b.nachkommen - a.nachkommen);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Stammbaum</h1>
        <p className="text-sm text-muted">
          Alle Zuchtlinien, ausgehend von den Stammmüttern. Jede Stufe nach rechts ist eine Generation.
          Grau = nicht mehr im Bestand.
        </p>
      </div>

      {linien.length === 0 ? (
        <Card className="text-center text-muted">
          Noch keine Königin mit erfasster Mutter. Nachgezogene Königinnen aus einer Zuchtserie
          bekommen ihre Mutter automatisch, so wächst der Stammbaum von selbst.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {linien.map(({ koenigin, nachkommen }) => (
            <Card key={koenigin.id} className="overflow-x-auto">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                Linie {koenigin.kennung} · {nachkommen} {nachkommen === 1 ? "Nachkomme" : "Nachkommen"}
              </p>
              <StammbaumZweig baum={baum} koenigin={koenigin} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
