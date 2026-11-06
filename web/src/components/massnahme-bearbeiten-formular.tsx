"use client";

import { massnahmeAktualisieren } from "@/lib/actions";
import { Button, Input } from "@/components/ui";
import { alsDatumWert } from "@/components/massnahme-felder";
import { IconHaken } from "@/components/icons";

// Bearbeiten einer bestehenden Maßnahme, schmal an Ort und Stelle: Text über
// die ganze Breite, darunter Termin mit ✓ (Speichern) und ✕ (Abbrechen).
// Ab Tablet alles in einer Zeile. Die Auswahl "Standardarbeit" gibt es nur
// beim Anlegen, beim Bearbeiten stand sie nur im Weg.
export function MassnahmeBearbeitenFormular({
  massnahme,
  fertig,
  zusatz,
}: {
  massnahme: { id: string; text: string; faelligAm: Date | null };
  fertig: () => void;
  /// Weitere Knöpfe rechts neben ✓ und ✕, z.B. Löschen.
  zusatz?: React.ReactNode;
}) {
  const id = `bearbeiten-${massnahme.id}`;
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      <form
        id={id}
        action={async (formData: FormData) => {
          await massnahmeAktualisieren(massnahme.id, formData);
          fertig();
        }}
        className="contents"
      >
        <Input
          name="text"
          defaultValue={massnahme.text}
          aria-label="Maßnahme"
          required
          className="min-h-11 sm:flex-[2]"
        />
      </form>
      <div className="flex items-center gap-2 sm:flex-1">
        <Input
          form={id}
          name="faelligAm"
          type="date"
          defaultValue={alsDatumWert(massnahme.faelligAm)}
          aria-label="Fällig am"
          className="min-h-11 min-w-0 flex-1"
        />
        <Button type="submit" form={id} groesse="symbol" aria-label="Speichern" title="Speichern">
          <IconHaken className="h-5 w-5" />
        </Button>
        <Button type="button" variant="secondary" groesse="symbol" onClick={fertig} aria-label="Abbrechen" title="Abbrechen">
          <span aria-hidden="true">✕</span>
        </Button>
        {zusatz}
      </div>
    </div>
  );
}
