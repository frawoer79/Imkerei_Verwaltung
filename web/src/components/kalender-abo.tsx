"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Zeigt die Adresse des Kalender-Feeds zum Abonnieren. Die Adresse selbst
// setzt die Seite serverseitig aus den Request-Headern zusammen, hier geht es
// nur noch ums Kopieren.
export function KalenderAbo({
  adresse,
  erneuern,
}: {
  adresse: string;
  erneuern: () => void;
}) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(adresse);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch {
      // Zwischenablage nicht erlaubt (z.B. ohne HTTPS) - dann muss die
      // Adresse von Hand markiert werden, sie steht ja sichtbar da.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1 text-sm font-medium text-muted">Adresse des Kalenders</p>
        <p className="break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
          {adresse}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={kopieren}>
          {kopiert ? "Kopiert ✓" : "Adresse kopieren"}
        </Button>
        <form action={erneuern}>
          <Button type="submit" variant="secondary">
            Neue Adresse erzeugen
          </Button>
        </form>
      </div>

      <details className="rounded-md border border-border bg-background p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          So richtest du das Abo auf dem iPhone oder iPad ein
        </summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-muted">
          <li>Adresse oben kopieren.</li>
          <li>
            Einstellungen → Apps → Kalender → Accounts → Account hinzufügen →
            Andere → <b>Kalenderabo hinzufügen</b>.
          </li>
          <li>Adresse einsetzen und auf Weiter tippen.</li>
          <li>
            Das iPhone fragt nach Benutzername und Passwort. Es sind dieselben
            wie für die Seite im Browser, denn der Passwortschutz gilt auch für
            den Kalender.
          </li>
          <li>
            Wichtig: den Schalter <b>„Alarme entfernen“ ausschalten</b>. Sonst
            wirft das iPhone die mitgelieferte Erinnerung weg und du bekommst
            keinen Weckruf.
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Danach stehen alle offenen Maßnahmen mit Termin im Kalender. Die
          Erinnerung kommt am Vortag um 10 Uhr. Änderst du hier einen Termin,
          zieht der Kalender beim nächsten Abgleich nach. Das iPhone gleicht je
          nach Einstellung alle paar Stunden ab, nicht sofort.
        </p>
      </details>

      <p className="text-xs text-muted">
        Wer diese Adresse kennt und das Seitenpasswort hat, kann deine
        Maßnahmen sehen. Ist sie in falsche Hände geraten, erzeuge eine neue
        Adresse. Die alte funktioniert dann nicht mehr, bestehende Abos musst
        du neu einrichten.
      </p>
    </div>
  );
}
