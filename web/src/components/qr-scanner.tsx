"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Liest QR-Codes direkt über die Gerätekamera - bewusst nicht über die
// Browser-eigene BarcodeDetector-API (Safari auf iPhone/iPad kennt sie
// nicht), sondern über jsQR, das reine Bilddaten auswertet und damit überall
// gleich funktioniert. Tastet laufend Kamerabilder ab, bis ein Code erkannt
// wird oder `aktiv` auf false wechselt (z.B. weil der Dialog geschlossen
// wurde) - dann wird die Kamera sofort wieder freigegeben.
export function QrScanner({
  aktiv,
  onErkannt,
}: {
  aktiv: boolean;
  onErkannt: (inhalt: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [erlaubnisHinweis, setErlaubnisHinweis] = useState<Geraet | null>(null);

  useEffect(() => {
    if (!aktiv) return;

    let stream: MediaStream | null = null;
    let bildlauf = 0;
    let abgebrochen = false;

    async function starten() {
      // Vorher nachsehen, ob der Browser die Kamera schon dauerhaft erlaubt.
      // Wenn nicht, fragt er gleich nach - dann zeigen wir unter dem Bild,
      // wie man die Frage für diese Seite ein für alle Mal abschaltet.
      const musstFragen = await kameraWirdErfragt();
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        if (!abgebrochen) {
          setFehler(
            "Kein Kamerazugriff möglich. Bitte in den Geräteeinstellungen erlauben und erneut versuchen."
          );
        }
        return;
      }
      if (abgebrochen || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setFehler(null);
      if (musstFragen && !hinweisAusgeblendet()) setErlaubnisHinweis(geraetErkennen());
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      bildlauf = requestAnimationFrame(abtasten);
    }

    function abtasten() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const kontext = canvas.getContext("2d");
        if (kontext) {
          kontext.drawImage(video, 0, 0, canvas.width, canvas.height);
          const bild = kontext.getImageData(0, 0, canvas.width, canvas.height);
          const treffer = jsQR(bild.data, bild.width, bild.height);
          if (treffer && treffer.data) {
            onErkannt(treffer.data);
            return;
          }
        }
      }
      bildlauf = requestAnimationFrame(abtasten);
    }

    starten();

    return () => {
      abgebrochen = true;
      cancelAnimationFrame(bildlauf);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);

  if (!aktiv) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/70" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {fehler ? (
        <p className="text-center text-sm text-gefahr">{fehler}</p>
      ) : (
        <p className="text-center text-sm text-muted">QR-Code vor die Kamera halten.</p>
      )}
      {erlaubnisHinweis && !fehler && (
        <ErlaubnisHinweis geraet={erlaubnisHinweis} onAusblenden={() => {
          hinweisAusblenden();
          setErlaubnisHinweis(null);
        }} />
      )}
    </div>
  );
}

type Geraet = "ios-safari" | "ios-webapp" | "ios-anderer" | "sonstiges";

const HINWEIS_SCHLUESSEL = "kamera-erlaubnis-hinweis-aus";

// Fragt der Browser beim nächsten getUserMedia-Aufruf nach? "granted" heißt:
// dauerhaft erlaubt, keine Frage. Kennt der Browser die Abfrage nicht (ältere
// Safari-Versionen), gilt das als "fragt" - lieber einmal zu oft der Hinweis.
async function kameraWirdErfragt(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state !== "granted";
  } catch {
    return true;
  }
}

function geraetErkennen(): Geraet {
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Mac, verrät sich aber über den Touchscreen.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return "sonstiges";
  // Vom Home-Bildschirm als Web-App geöffnet: keine Adressleiste, also auch
  // kein aA-Menü mit den Website-Einstellungen.
  const webApp =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (webApp) return "ios-webapp";
  return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-anderer" : "ios-safari";
}

function hinweisAusgeblendet(): boolean {
  try {
    return localStorage.getItem(HINWEIS_SCHLUESSEL) === "1";
  } catch {
    return false;
  }
}

function hinweisAusblenden() {
  try {
    localStorage.setItem(HINWEIS_SCHLUESSEL, "1");
  } catch {
    // Privates Fenster o.ä. - dann eben beim nächsten Mal wieder.
  }
}

// Die Erlaubnis selbst kann eine Webseite nicht dauerhaft setzen, das darf
// nur der Nutzer im Browser. Safari auf iPhone/iPad fragt ab Werk bei jedem
// Seitenaufruf neu, merkt sich aber "Erlauben" je Website, wenn man es dort
// einstellt.
function ErlaubnisHinweis({ geraet, onAusblenden }: { geraet: Geraet; onAusblenden: () => void }) {
  return (
    <div className="w-full max-w-xs rounded-lg border border-border bg-background p-3 text-xs">
      <p className="font-medium">Fragt der Browser jedes Mal nach der Kamera?</p>
      {geraet === "ios-safari" && (
        <p className="mt-1 text-muted">
          Einmal dauerhaft erlauben: In Safari links in der Adressleiste auf das Seitenmenü (<b>aA</b>{" "}
          bzw. <b>⋯</b>) tippen → <b>Website-Einstellungen</b> → <b>Kamera</b> → <b>Erlauben</b>. Danach
          öffnet sich der Scanner ohne Rückfrage.
        </p>
      )}
      {geraet === "ios-webapp" && (
        <p className="mt-1 text-muted">
          Als Web-App vom Home-Bildschirm gibt es kein aA-Menü. Abhilfe in der Einstellungen-App:{" "}
          <b>Apps</b> → <b>Safari</b> → <b>Kamera</b> → <b>Erlauben</b>. Das gilt dann allerdings für alle
          Webseiten, nicht nur für diese.
        </p>
      )}
      {geraet === "ios-anderer" && (
        <p className="mt-1 text-muted">
          Dieser Browser lässt sich auf iPhone/iPad meist nicht dauerhaft einstellen. In Safari geht es:
          Imkereiverwaltung dort öffnen, dann <b>aA</b> → <b>Website-Einstellungen</b> → <b>Kamera</b> →{" "}
          <b>Erlauben</b>.
        </p>
      )}
      {geraet === "sonstiges" && (
        <p className="mt-1 text-muted">
          Auf das Schloss- bzw. Einstellungssymbol links neben der Adresse tippen und die Kamera für diese
          Seite dauerhaft <b>erlauben</b> (nicht nur „dieses Mal“).
        </p>
      )}
      <button type="button" onClick={onAusblenden} className="mt-2 text-xs underline text-muted">
        Hinweis nicht mehr zeigen
      </button>
    </div>
  );
}
