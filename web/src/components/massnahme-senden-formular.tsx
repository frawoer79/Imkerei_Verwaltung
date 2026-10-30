"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { massnahmenFuerVoelkerHinzufuegen } from "@/lib/actions";
import { einreihenUndSenden, entfernen, sendungAusFormular } from "@/lib/warteschlange";

// Formular "Neue Maßnahme" für ein oder mehrere Völker (Felder text,
// faelligAm, volkIds). Gesendet wird über die Warteschlange
// (lib/warteschlange.ts): Im Funkloch bleibt die Maßnahme auf dem Gerät, das
// Popup schließt trotzdem, die Leiste oben zeigt, was noch wartet.

export function MassnahmeSendenFormular({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pfad = usePathname();
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function beiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendet) return;
    const formular = event.currentTarget;
    const formData = new FormData(formular);
    const text = formData.get("text")?.toString().trim() ?? "";
    setFehler(null);
    setSendet(true);
    try {
      const sendung = sendungAusFormular(formData, { art: "massnahme", ziel: pfad, titel: `Maßnahme: ${text}` });
      const ergebnis = await einreihenUndSenden(sendung);
      if (ergebnis === null) {
        // Ohne Warteschlange wie früher direkt senden.
        await massnahmenFuerVoelkerHinzufuegen(formData);
      } else if (ergebnis.art === "abgelehnt") {
        // Prüffehler: gleich hier zeigen statt in der Warteschlange.
        await entfernen(sendung.id);
        setFehler(ergebnis.fehler);
        return;
      }
      formular.reset();
      formular.closest("dialog")?.close();
      if (ergebnis === null || ergebnis.art === "ok") router.refresh();
    } finally {
      setSendet(false);
    }
  }

  return (
    <form onSubmit={(event) => void beiSubmit(event)} className={className}>
      <fieldset disabled={sendet} className="contents">
        {children}
      </fieldset>
      {fehler && (
        <p role="alert" className="text-sm font-medium text-gefahr">
          {fehler}
        </p>
      )}
    </form>
  );
}
