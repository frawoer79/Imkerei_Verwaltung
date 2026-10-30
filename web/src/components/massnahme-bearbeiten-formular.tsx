"use client";

import { massnahmeAktualisieren } from "@/lib/actions";
import { Button } from "@/components/ui";
import { MassnahmeFelder } from "@/components/massnahme-felder";

// Bearbeitungsform einer bestehenden Maßnahme - wird an Ort und Stelle in der
// Liste eingeblendet, statt auf eine eigene Seite zu springen.
export function MassnahmeBearbeitenFormular({
  massnahme,
  fertig,
}: {
  massnahme: { id: string; text: string; faelligAm: Date | null };
  fertig: () => void;
}) {
  return (
    <form
      action={async (formData: FormData) => {
        await massnahmeAktualisieren(massnahme.id, formData);
        fertig();
      }}
      className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end"
    >
      <MassnahmeFelder
        idPraefix={`bearbeiten-${massnahme.id}`}
        text={massnahme.text}
        faelligAm={massnahme.faelligAm}
      />
      <div className="flex gap-2">
        <Button type="submit">Speichern</Button>
        <Button type="button" variant="secondary" onClick={fertig}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
