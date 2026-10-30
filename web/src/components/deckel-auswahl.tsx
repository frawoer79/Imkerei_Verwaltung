import Link from "next/link";
import { Label, Select } from "@/components/ui";
import type { KlimadeckelAuswahl } from "@/lib/lager";

// Deckel eines Volkes: Standarddeckel (leer, wird nirgends gezählt) oder einer
// der Klimadeckel aus dem Lager. Die Lager-Seite zählt daraus, wie viele
// Klimadeckel im Einsatz und noch verfügbar sind.
export function DeckelAuswahl({
  klimadeckel,
  klimadeckelId,
}: {
  klimadeckel: KlimadeckelAuswahl[];
  klimadeckelId?: string | null;
}) {
  if (klimadeckel.length === 0) {
    return (
      <p className="rounded-md border border-border bg-background p-3 text-xs text-muted">
        Deckel: Standarddeckel. Klimadeckel sind wählbar, sobald im{" "}
        <Link href="/lager/material" className="text-accent hover:underline">
          Lager
        </Link>{" "}
        einer angelegt ist.
      </p>
    );
  }

  return (
    <div>
      <Label htmlFor="klimadeckelId">Deckel</Label>
      <Select id="klimadeckelId" name="klimadeckelId" defaultValue={klimadeckelId ?? ""}>
        <option value="">Standarddeckel</option>
        {klimadeckel.map((deckel) => (
          <option key={deckel.id} value={deckel.id}>
            {deckel.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
