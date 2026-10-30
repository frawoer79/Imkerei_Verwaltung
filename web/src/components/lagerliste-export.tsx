"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Knopf "PDF erstellen" in der Kopfzeile der Material- bzw. Erzeugnis-Kachel.
// Beim Antippen erzeugt der Server die PDF-Datei und legt sie ab - sie
// erscheint dann unten auf der Lager-Seite und unter Dokumente.
export function LagerlisteExport({
  art,
  erstellen,
}: {
  art: "MATERIAL" | "ERZEUGNISSE";
  erstellen: (art: "MATERIAL" | "ERZEUGNISSE") => Promise<void>;
}) {
  const [laeuft, setLaeuft] = useState(false);

  async function los() {
    setLaeuft(true);
    try {
      await erstellen(art);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={los} disabled={laeuft} className="shrink-0">
      {laeuft ? "PDF wird erstellt …" : "PDF erstellen"}
    </Button>
  );
}
