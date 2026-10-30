"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { volkQrCodeEntfernen, volkQrCodeLernen } from "@/lib/actions";
import { codeAusQrInhalt } from "@/lib/qr";
import { QrScanner } from "@/components/qr-scanner";
import { Button } from "@/components/ui";
import { IconQrCode } from "@/components/icons";
import { AKTION_KACHEL, AKTION_SYMBOL } from "@/components/volk-aktion-kachel";
import { bestaetigen } from "@/lib/bestaetigen";

type Konflikt = { volkId: string; volkName: string; bienenstandName: string };

// Lernt einen gescannten QR-Code (fertige Karte oder selbst erzeugter Code,
// siehe /einstellungen/qr-codes) für dieses Volk an - ab dann öffnet ein Scan
// über /scannen oder den Direktlink des eigenen Codes direkt diese
// Stockkarte. Sitzt als einzelner Button im Kopf der Stockkarte statt als
// eigene Kachel. Ist schon ein Code angelernt, heißt der Knopf "QR-Code
// bearbeiten"; im Dialog dahinter wird der Code gelöscht oder ein neuer
// angelernt (ersetzt den alten).
export function VolkQrCode({ volkId, wert }: { volkId: string; wert: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scannerOffen, setScannerOffen] = useState(false);
  const [konflikt, setKonflikt] = useState<Konflikt | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [istPending, startTransition] = useTransition();
  const letzterCode = useRef<string>("");

  function oeffnen() {
    setFehler(null);
    setKonflikt(null);
    setScannerOffen(!wert);
    dialogRef.current?.showModal();
  }

  function speichern(code: string, uebernehmen: boolean) {
    letzterCode.current = code;
    startTransition(async () => {
      const ergebnis = await volkQrCodeLernen(volkId, code, uebernehmen);
      if (ergebnis.ok) {
        setScannerOffen(false);
        setKonflikt(null);
        setFehler(null);
        dialogRef.current?.close();
        router.refresh();
        return;
      }
      if ("konflikt" in ergebnis) {
        setKonflikt(ergebnis.konflikt);
      } else {
        setFehler(ergebnis.fehler);
      }
    });
  }

  async function entfernen() {
    if (!(await bestaetigen("QR-Code von diesem Volk löschen? Ein Scan dieses Codes öffnet das Volk dann nicht mehr. Du kannst jederzeit einen neuen anlernen.", { gefahr: true }))) return;
    startTransition(async () => {
      await volkQrCodeEntfernen(volkId);
      dialogRef.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={oeffnen} className={AKTION_KACHEL}>
        <IconQrCode className={AKTION_SYMBOL} />
        QR-Code
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
        onClose={() => setScannerOffen(false)}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{wert ? "QR-Code bearbeiten" : "QR-Code lernen"}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          {!scannerOffen && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {wert
                  ? "Ein QR-Code ist mit diesem Volk verknüpft. Ein neu angelernter Code ersetzt ihn."
                  : "Noch kein QR-Code angelernt."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setFehler(null);
                    setKonflikt(null);
                    setScannerOffen(true);
                  }}
                >
                  {wert ? "Neuen anlernen" : "Scannen"}
                </Button>
                {wert && (
                  <Button type="button" variant="danger" onClick={entfernen} disabled={istPending}>
                    Code löschen
                  </Button>
                )}
              </div>
            </div>
          )}

          {scannerOffen && !konflikt && (
            <div className="flex flex-col gap-3">
              <QrScanner
                aktiv={scannerOffen}
                onErkannt={(inhalt) => speichern(codeAusQrInhalt(inhalt), false)}
              />
              {istPending && <p className="text-center text-sm text-muted">Code wird gespeichert …</p>}
              {fehler && <p className="text-center text-sm text-gefahr">{fehler}</p>}
              {wert && (
                <Button type="button" variant="secondary" onClick={() => setScannerOffen(false)}>
                  Abbrechen
                </Button>
              )}
            </div>
          )}

          {konflikt && (
            <div className="flex flex-col gap-3 text-center">
              <p className="text-sm">
                Dieser Code gehört bereits zu <span className="font-medium">{konflikt.bienenstandName} · {konflikt.volkName}</span>.
                Trotzdem auf dieses Volk übertragen?
              </p>
              <div className="flex justify-center gap-3">
                <Button type="button" variant="secondary" onClick={() => setKonflikt(null)} disabled={istPending}>
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => speichern(letzterCode.current, true)}
                  disabled={istPending}
                >
                  Übertragen
                </Button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
