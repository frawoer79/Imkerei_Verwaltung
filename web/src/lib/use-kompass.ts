"use client";

import { useEffect, useRef, useState } from "react";
import { MISSWEISUNG_GRAD } from "@/lib/nestsuche";

type OrientierungMitKompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientierungMitErlaubnis = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

// Mindestabstand zwischen zwei Meldungen an die Oberfläche und kleinste
// Änderung, die weitergegeben wird. Der Sensor liefert bis zu 60 Werte pro
// Sekunde, die Karte und die Berechnung müssen nicht jeden einzeln zeigen.
const MELDE_ABSTAND_MS = 100;
const MELDE_SCHWELLE_GRAD = 0.5;

function winkelAbstand(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

// Handy-Kompass für die Peilung: liefert die Richtung, in die die Oberkante
// des (flach gehaltenen) Handys zeigt, in Grad zu geografisch Nord.
// - iPhone/iPad (Safari): "deviceorientation" mit webkitCompassHeading,
//   vorher einmal um Erlaubnis fragen (muss aus einem Tippen heraus passieren).
// - Android (Chrome): "deviceorientationabsolute", alpha zählt gegen den
//   Uhrzeigersinn, deshalb 360 - alpha.
// Beide liefern magnetisch Nord, die Missweisung wird aufgeschlagen. Die
// Werte zittern, deshalb wird über die letzten Messungen gemittelt (als
// Vektoren, damit 359° und 1° nicht 180° ergeben).
//
// Mehrere Stellen können den Kompass gleichzeitig brauchen (die drehende Karte
// und die Peilung einer Hornisse). Jede meldet sich mit einem eigenen Namen
// an, der Sensor läuft, solange mindestens einer angemeldet ist.
export function useKompass() {
  const [nutzer, setNutzer] = useState<string[]>([]);
  const [grad, setGrad] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const verlaufRef = useRef<number[]>([]);
  const letzterGradRef = useRef<number | null>(null);
  const letzteMeldungRef = useRef(0);
  const aktiv = nutzer.length > 0;

  async function anfordern(name: string): Promise<boolean> {
    setFehler(null);
    if (!aktiv) {
      verlaufRef.current = [];
      letzterGradRef.current = null;
      setGrad(null);
      if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
        setFehler("Dieses Gerät hat keinen Kompass. Richtung bitte auf der Karte einzeichnen.");
        return false;
      }
      const Ereignis = DeviceOrientationEvent as OrientierungMitErlaubnis;
      if (typeof Ereignis.requestPermission === "function") {
        try {
          const antwort = await Ereignis.requestPermission();
          if (antwort !== "granted") {
            setFehler(
              "Kein Zugriff auf den Kompass erlaubt. In den Safari-Einstellungen unter „Bewegung & Ausrichtung“ freigeben.",
            );
            return false;
          }
        } catch {
          setFehler("Der Kompass konnte nicht gestartet werden.");
          return false;
        }
      }
    }
    setNutzer((alt) => (alt.includes(name) ? alt : [...alt, name]));
    return true;
  }

  function freigeben(name: string) {
    setNutzer((alt) => alt.filter((eintrag) => eintrag !== name));
  }

  // Alle Anmeldungen mit diesem Namensanfang beenden, z. B. "peil:".
  function freigebenMitAnfang(anfang: string) {
    setNutzer((alt) => alt.filter((eintrag) => !eintrag.startsWith(anfang)));
  }

  useEffect(() => {
    if (!aktiv) return;
    let gesehen = false;

    function verarbeiten(magnetisch: number) {
      gesehen = true;
      const wahr = (magnetisch + MISSWEISUNG_GRAD + 360) % 360;
      const verlauf = verlaufRef.current;
      verlauf.push(wahr);
      if (verlauf.length > 10) verlauf.shift();
      let x = 0;
      let y = 0;
      for (const wert of verlauf) {
        x += Math.sin((wert * Math.PI) / 180);
        y += Math.cos((wert * Math.PI) / 180);
      }
      const mittel = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
      const jetzt = performance.now();
      const alt = letzterGradRef.current;
      if (alt !== null && (jetzt - letzteMeldungRef.current < MELDE_ABSTAND_MS || winkelAbstand(alt, mittel) < MELDE_SCHWELLE_GRAD)) {
        return;
      }
      letzteMeldungRef.current = jetzt;
      letzterGradRef.current = mittel;
      setGrad(mittel);
    }

    function bildschirmWinkel(): number {
      return typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
    }

    function beiOrientierung(event: Event) {
      const e = event as OrientierungMitKompass;
      if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) {
        verarbeiten(e.webkitCompassHeading);
      } else if (e.absolute && typeof e.alpha === "number" && Number.isFinite(e.alpha)) {
        verarbeiten((360 - e.alpha + bildschirmWinkel()) % 360);
      }
    }

    function beiAbsolut(event: Event) {
      const e = event as DeviceOrientationEvent;
      if (typeof e.alpha === "number" && Number.isFinite(e.alpha)) verarbeiten((360 - e.alpha + bildschirmWinkel()) % 360);
    }

    const absolutMoeglich = "ondeviceorientationabsolute" in window;
    if (absolutMoeglich) window.addEventListener("deviceorientationabsolute", beiAbsolut);
    else window.addEventListener("deviceorientation", beiOrientierung);

    const pruefung = setTimeout(() => {
      if (!gesehen) {
        setFehler("Vom Gerät kommen keine Kompasswerte. Richtung bitte auf der Karte einzeichnen.");
        setNutzer([]);
      }
    }, 3000);

    return () => {
      clearTimeout(pruefung);
      if (absolutMoeglich) window.removeEventListener("deviceorientationabsolute", beiAbsolut);
      else window.removeEventListener("deviceorientation", beiOrientierung);
    };
  }, [aktiv]);

  return {
    aktiv,
    grad,
    fehler,
    nutzer,
    hat: (name: string) => nutzer.includes(name),
    anfordern,
    freigeben,
    freigebenMitAnfang,
  };
}
