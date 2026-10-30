import { Button, Card } from "@/components/ui";
import { BEREICHE, abgeschalteteBereiche } from "@/lib/bereiche";
import { bereicheSpeichern } from "@/lib/bereiche-actions";
import { SeitenNavigation } from "@/components/seiten-navigation";

export default async function BereichePage() {
  const aus = await abgeschalteteBereiche();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SeitenNavigation className="mb-2" />
        <h1 className="text-2xl font-semibold tracking-tight">Bereiche</h1>
        <p className="text-sm text-muted">
          Was du nicht brauchst, kannst du ausblenden. Gelöscht wird dabei nichts: Schaltest du einen
          Bereich wieder ein, ist alles wie vorher. Bienenstände, Maßnahmen und Einstellungen sind
          immer da.
        </p>
      </div>

      <Card>
        <form action={bereicheSpeichern} className="flex flex-col gap-3">
          {BEREICHE.map((bereich) => (
            <label key={bereich.schluessel} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="an"
                value={bereich.schluessel}
                defaultChecked={!aus.includes(bereich.schluessel)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className="font-medium">{bereich.name}</span>
                <span className="block text-muted">{bereich.hinweis}</span>
              </span>
            </label>
          ))}
          <div>
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
