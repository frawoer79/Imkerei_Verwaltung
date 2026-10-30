import Link from "next/link";
import { Label, Select, Input } from "@/components/ui";
import { type ZargeAuswahl } from "@/lib/honig";

// Brutraum eines Volkes: eine Zarge aus den Einstellungen, plus wie viele
// davon gestapelt sind (Betriebsweise) - eine Eigenschaft des Volkes, nicht
// der Zarge, da dieselbe Kistengröße bei einem Volk einräumig und bei einem
// anderen zweiräumig laufen kann. Bestimmt auch, welches Beutensystem in
// der Durchsicht beim Honigraum oben steht.
//
// Freiwillig: ohne Angabe funktioniert alles Übrige weiter, nur die Vorauswahl
// beim Honigraum fällt dann weg.
export function BrutraumAuswahl({
  brutraeume,
  zargeId,
  zargenAnzahl,
}: {
  brutraeume: ZargeAuswahl[];
  zargeId?: string | null;
  zargenAnzahl?: number;
}) {
  if (brutraeume.length === 0) {
    return (
      <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">
        Brutraum wählbar, sobald unter{" "}
        <Link href="/einstellungen/beuten" className="text-accent hover:underline">
          Einstellungen → Beutensysteme
        </Link>{" "}
        eine Zarge angelegt ist.
      </p>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label htmlFor="brutraumZargeId">Brutraum</Label>
        <Select id="brutraumZargeId" name="brutraumZargeId" defaultValue={zargeId ?? ""}>
          <option value="">nicht festgelegt</option>
          {brutraeume.map((zarge) => (
            <option key={zarge.id} value={zarge.id}>
              {zarge.systemName} {zarge.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-24">
        <Label htmlFor="brutraumZargenAnzahl">Anzahl</Label>
        <Input
          id="brutraumZargenAnzahl"
          name="brutraumZargenAnzahl"
          type="number"
          min="1"
          max="5"
          defaultValue={zargenAnzahl ?? 1}
        />
      </div>
    </div>
  );
}
