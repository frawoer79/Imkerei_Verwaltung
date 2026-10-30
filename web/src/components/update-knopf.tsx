"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { bestaetigen } from "@/lib/bestaetigen";
import { updateEinspielen } from "@/lib/update-actions";
import type { UpdateStatus } from "@/lib/update-steuerung";

// Knopf "Update einspielen" unter Einstellungen -> System. Bittet den Server
// um das Update (lib/update-steuerung.ts) und zeigt danach den Stand an. Die
// App startet dabei neu: solange sie nicht antwortet, steht hier "startet neu".

const TAKT_MS = 3000;
// So lange darf der Dienst auf dem Server brauchen, bis er sich meldet.
const DIENST_WARTEN_MS = 60_000;

const datumZeit = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

type Phase = "ruhe" | "angefordert" | "laeuft" | "neustart" | "ende";

export function UpdateKnopf({
  version,
  letzterStatus,
}: {
  /// Neueste Version, auf die der Knopf aktualisiert.
  version: string | null;
  letzterStatus: UpdateStatus | null;
}) {
  const [phase, setPhase] = useState<Phase>(letzterStatus?.zustand === "laeuft" ? "laeuft" : "ruhe");
  const [status, setStatus] = useState<UpdateStatus | null>(letzterStatus);
  const [fehler, setFehler] = useState<string | null>(null);
  const [dienstStumm, setDienstStumm] = useState(false);
  // Zeitstempel des Stands vor dem Knopfdruck: jeder andere ist neu.
  const vorher = useRef(letzterStatus?.zeit ?? "");
  const angefordertUm = useRef(0);

  const verfolgen = phase === "angefordert" || phase === "laeuft" || phase === "neustart";

  useEffect(() => {
    if (!verfolgen) return;
    let aktiv = true;
    const abfragen = async () => {
      try {
        const antwort = await fetch("/api/update-status", { cache: "no-store", redirect: "manual" });
        if (!antwort.ok) throw new Error();
        const daten = (await antwort.json()) as { status: UpdateStatus | null };
        if (!aktiv) return;
        const neu = daten.status;
        if (!neu || neu.zeit === vorher.current) {
          if (phase === "angefordert" && Date.now() - angefordertUm.current > DIENST_WARTEN_MS) {
            setDienstStumm(true);
          }
          return;
        }
        setStatus(neu);
        setDienstStumm(false);
        if (neu.zustand === "laeuft") {
          setPhase("laeuft");
        } else {
          setPhase("ende");
          // Neue Version: Seite neu laden, damit Nummer und Knöpfe stimmen.
          if (neu.zustand === "fertig" || neu.zustand === "zurueck") {
            setTimeout(() => window.location.reload(), 2500);
          }
        }
      } catch {
        // Keine Antwort: die App wird gerade ausgetauscht.
        if (aktiv && phase !== "angefordert") setPhase("neustart");
      }
    };
    abfragen();
    const takt = setInterval(abfragen, TAKT_MS);
    return () => {
      aktiv = false;
      clearInterval(takt);
    };
  }, [verfolgen, phase]);

  async function starten() {
    const frage = version
      ? `Version ${version} jetzt einspielen? Vorher wird die Datenbank gesichert. Die App ist dabei ein paar Minuten nicht erreichbar.`
      : "Update jetzt einspielen?";
    if (!(await bestaetigen(frage, { ja: "Update einspielen" }))) return;
    setFehler(null);
    const ergebnis = await updateEinspielen();
    if (ergebnis.fehler) {
      setFehler(ergebnis.fehler);
      return;
    }
    vorher.current = status?.zeit ?? "";
    angefordertUm.current = Date.now();
    setDienstStumm(false);
    setPhase("angefordert");
  }

  return (
    <div className="flex flex-col gap-3">
      {phase === "ruhe" || phase === "ende" ? (
        version && (
          <div>
            <Button type="button" onClick={starten}>
              Update auf {version} einspielen
            </Button>
          </div>
        )
      ) : (
        <p className="rounded-md border border-border bg-flaeche px-3 py-2 text-sm" aria-live="polite">
          <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-accent align-middle" />
          {phase === "angefordert" && "Warte auf den Server …"}
          {phase === "laeuft" && `${status?.schritt || "Update läuft"} …`}
          {phase === "neustart" && "Die App startet neu …"}
        </p>
      )}

      {dienstStumm && (
        <p className="text-sm text-gefahr">
          Der Server reagiert nicht auf den Knopf. Bitte am Server eingeben:{" "}
          <code className="rounded bg-flaeche px-1 font-mono">sudo imkerei-update</code>
        </p>
      )}
      {fehler && <p className="text-sm text-gefahr">{fehler}</p>}

      {status && status.zustand !== "laeuft" && (phase === "ruhe" || phase === "ende") && (
        <StatusZeile status={status} />
      )}
    </div>
  );
}

function StatusZeile({ status }: { status: UpdateStatus }) {
  const wann = status.zeit ? datumZeit.format(new Date(status.zeit)) : "";
  const text = {
    fertig: `Update eingespielt${status.von && status.nach ? ` (${status.von} → ${status.nach})` : ""}.`,
    aktuell: "Schon auf dem neuesten Stand.",
    zurueck: `Update hat nicht geklappt, zurück auf Version ${status.nach || "?"}.`,
    fehler: `Update nicht eingespielt: ${status.schritt}.`,
    laeuft: "",
  }[status.zustand];
  const rot = status.zustand === "zurueck" || status.zustand === "fehler";
  return (
    <p className={`text-sm ${rot ? "text-gefahr" : "text-muted"}`}>
      Letzter Lauf{wann && ` am ${wann}`}: {text}
      {status.meldung && <span className="block">{status.meldung}</span>}
    </p>
  );
}
