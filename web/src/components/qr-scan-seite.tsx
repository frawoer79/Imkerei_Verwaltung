"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { volkFuerQrCode } from "@/lib/actions";
import { codeAusQrInhalt } from "@/lib/qr";
import { QrScanner } from "@/components/qr-scanner";
import { Button, Card, LinkKnopf } from "@/components/ui";

type Ergebnis = { art: "unbekannt" } | { art: "gefunden"; volkId: string; text: string };

export function QrScanSeite() {
  const router = useRouter();
  const [aktiv, setAktiv] = useState(true);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [istPending, startTransition] = useTransition();

  function scanAuswerten(inhalt: string) {
    setAktiv(false);
    const code = codeAusQrInhalt(inhalt);
    startTransition(async () => {
      const volk = await volkFuerQrCode(code);
      if (!volk) {
        setErgebnis({ art: "unbekannt" });
        return;
      }
      setErgebnis({ art: "gefunden", volkId: volk.id, text: `${volk.bienenstandName} · ${volk.name}` });
      router.push(`/voelker/${volk.id}`);
    });
  }

  function erneutScannen() {
    setErgebnis(null);
    setAktiv(true);
  }

  return (
    <Card className="max-w-md">
      {aktiv && <QrScanner aktiv={aktiv} onErkannt={scanAuswerten} />}

      {!aktiv && istPending && <p className="text-center text-sm text-muted">Code wird gesucht …</p>}

      {!aktiv && ergebnis?.art === "gefunden" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm">
            Gefunden: <span className="font-medium">{ergebnis.text}</span>
          </p>
          <p className="text-sm text-muted">Stockkarte wird geöffnet …</p>
        </div>
      )}

      {!aktiv && ergebnis?.art === "unbekannt" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm">
            Dieser QR-Code ist noch keinem Volk zugeordnet. Öffne die Stockkarte des passenden Volks und
            nutze dort „QR-Code lernen“.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" variant="secondary" onClick={erneutScannen}>
              Erneut scannen
            </Button>
            <LinkKnopf href="/">Zur Übersicht</LinkKnopf>
          </div>
        </div>
      )}
    </Card>
  );
}
