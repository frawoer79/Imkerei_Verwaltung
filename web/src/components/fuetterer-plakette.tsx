import { IconTropfen } from "@/components/icons";

// Hinweis "Fütterer drauf" im Kopf der Volk-Seite und auf der Volkskachel am
// Stand. Erscheint, solange die letzte Fütterer-Aktion "aufgesetzt" ist.
export function FuettererPlakette() {
  return (
    <span
      title="Fütterer liegt auf (letzte Angabe in der Stockkarte)"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground"
    >
      <IconTropfen className="h-3.5 w-3.5" /> Fütterer drauf
    </span>
  );
}
