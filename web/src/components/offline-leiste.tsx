"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkKnopf } from "@/components/ui";
import { bestaetigen } from "@/lib/bestaetigen";
import {
  type SendungKurz,
  abonnieren,
  allesSenden,
  alsEntwurfOeffnen,
  beiGesendet,
  entfernen,
  erneutVersuchen,
  sendungenZaehlen,
  serverZustand,
  zustandLesen,
} from "@/lib/warteschlange";

// Schmale Leiste oben: zeigt, ob das Gerät Verbindung hat und ob noch
// Durchsichten in der Warteschlange auf dem Gerät liegen (lib/warteschlange.ts).
// Hier sitzt auch der Takt, der die Warteschlange von selbst nachsendet:
// beim Öffnen der App, wenn das Netz wiederkommt, wenn die App wieder in den
// Vordergrund kommt, und alle 30 Sekunden.
//
// Antippen öffnet die Liste der wartenden Durchsichten. Andere Stellen (der
// Hinweis im Verlauf des Volks) öffnen sie mit warteschlangeZeigen().

const TAKT_MS = 30_000;
const GESENDET_ZEIGEN_MS = 4000;
const OEFFNEN_EREIGNIS = "warteschlange-zeigen";

export function warteschlangeZeigen() {
  window.dispatchEvent(new Event(OEFFNEN_EREIGNIS));
}

function onlineAbonnieren(melden: () => void) {
  window.addEventListener("online", melden);
  window.addEventListener("offline", melden);
  return () => {
    window.removeEventListener("online", melden);
    window.removeEventListener("offline", melden);
  };
}

/// "25.10., 15:12" aus dem Datum im Formular.
export function sendungDatum(sendung: SendungKurz): string {
  const datum = new Date(sendung.datum || sendung.erstelltAm);
  if (Number.isNaN(datum.getTime())) return "";
  const tag = datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const zeit = datum.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${tag}, ${zeit}`;
}

export function OfflineLeiste() {
  const online = useSyncExternalStore(
    onlineAbonnieren,
    () => navigator.onLine,
    // Auf dem Server gilt "online" - die Leiste erscheint erst im Browser.
    () => true
  );
  const warteschlange = useSyncExternalStore(abonnieren, zustandLesen, serverZustand);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [gesendetZeigen, setGesendetZeigen] = useState(false);

  // Von selbst nachsenden.
  useEffect(() => {
    const anstossen = () => {
      if (navigator.onLine) void allesSenden();
    };
    const sichtbar = () => {
      if (document.visibilityState === "visible") anstossen();
    };
    const zeigen = () => dialogRef.current?.showModal();
    anstossen();
    window.addEventListener("online", anstossen);
    document.addEventListener("visibilitychange", sichtbar);
    window.addEventListener(OEFFNEN_EREIGNIS, zeigen);
    const takt = setInterval(anstossen, TAKT_MS);
    // Angekommen: Seite neu laden, damit der Eintrag im Verlauf steht.
    const abmelden = beiGesendet(() => router.refresh());
    return () => {
      window.removeEventListener("online", anstossen);
      document.removeEventListener("visibilitychange", sichtbar);
      window.removeEventListener(OEFFNEN_EREIGNIS, zeigen);
      clearInterval(takt);
      abmelden();
    };
  }, [router]);

  // "Alles gesendet" kurz stehen lassen.
  useEffect(() => {
    if (!warteschlange.zuletztGesendet) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGesendetZeigen(true);
    const uhr = setTimeout(() => setGesendetZeigen(false), GESENDET_ZEIGEN_MS);
    return () => clearTimeout(uhr);
  }, [warteschlange.zuletztGesendet]);

  const wartend = warteschlange.sendungen.filter((sendung) => !sendung.fehler);
  const abgelehnt = warteschlange.sendungen.filter((sendung) => sendung.fehler);

  let leiste: { ton: "warnung" | "gefahr" | "ok"; kurz: string; lang: string } | null = null;
  if (abgelehnt.length > 0) {
    const text = `${sendungenZaehlen(abgelehnt).text} nicht angenommen.`;
    leiste = { ton: "gefahr", kurz: text, lang: `${text} Bitte entscheiden, was damit passiert.` };
  } else if (wartend.length > 0) {
    const zaehlung = sendungenZaehlen(wartend);
    const eine = zaehlung.anzahl === 1;
    const warten = `${zaehlung.text} ${eine ? "wartet" : "warten"}`;
    if (!online) leiste = { ton: "warnung", kurz: `Offline. ${warten}.`, lang: `Keine Verbindung. ${warten} auf Netz.` };
    else if (warteschlange.abgemeldet)
      leiste = { ton: "warnung", kurz: `${warten}. Bitte anmelden.`, lang: `${warten}. Bitte neu anmelden.` };
    else if (warteschlange.sendetGerade) {
      const text = `${zaehlung.text} ${eine ? "wird" : "werden"} gesendet …`;
      leiste = { ton: "warnung", kurz: text, lang: text };
    } else leiste = { ton: "warnung", kurz: `${warten} auf Senden.`, lang: `${warten} auf Senden.` };
  } else if (!online) {
    leiste = {
      ton: "warnung",
      kurz: "Offline. Eingaben bleiben auf dem Gerät.",
      lang: "Keine Verbindung. Eingaben werden auf diesem Gerät gesichert.",
    };
  } else if (gesendetZeigen) {
    leiste = { ton: "ok", kurz: "Alles gesendet.", lang: "Alles gesendet." };
  }

  const farben = {
    warnung: "bg-warnung-flaeche text-warnung",
    gefahr: "bg-gefahr-flaeche text-gefahr",
    ok: "bg-ok-flaeche text-ok",
  };

  return (
    <>
      {leiste && (
        <div role="status" className={`sticky top-0 z-40 print:hidden ${farben[leiste.ton]}`}>
          {warteschlange.sendungen.length > 0 ? (
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 px-4 py-1.5 text-center text-sm font-medium"
            >
              {/* Am Handy einzeilig: dort die Kurzfassung. */}
              <span className="sm:hidden">{leiste.kurz}</span>
              <span className="hidden sm:inline">{leiste.lang}</span>
              <span className="underline underline-offset-2">Ansehen</span>
            </button>
          ) : (
            <p className="px-4 py-1.5 text-center text-xs font-medium">
              <span className="sm:hidden">{leiste.kurz}</span>
              <span className="hidden sm:inline">{leiste.lang}</span>
            </p>
          )}
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Noch nicht gesendet</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Schließen"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>

          {warteschlange.sendungen.length === 0 ? (
            <p className="text-sm text-muted">Alles gesendet. Auf diesem Gerät wartet nichts mehr.</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Diese Eingaben liegen auf diesem Gerät. Die App sendet sie von selbst, sobald Netz da ist. Du
                musst nichts tun.
              </p>
              <ul className="flex flex-col gap-3">
                {warteschlange.sendungen.map((sendung) => (
                  <SendungZeile
                    key={sendung.id}
                    sendung={sendung}
                    oeffnen={async () => {
                      const ziel = await alsEntwurfOeffnen(sendung.id);
                      dialogRef.current?.close();
                      if (ziel) router.push(ziel);
                    }}
                  />
                ))}
              </ul>
              <div className="flex flex-wrap justify-end gap-2">
                {warteschlange.abgemeldet && (
                  <LinkKnopf variant="secondary" href="/login">
                    Anmelden
                  </LinkKnopf>
                )}
                {wartend.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => void allesSenden()}
                    disabled={!online || warteschlange.sendetGerade}
                  >
                    {warteschlange.sendetGerade ? "Wird gesendet …" : "Jetzt senden"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function SendungZeile({ sendung, oeffnen }: { sendung: SendungKurz; oeffnen: () => void }) {
  async function verwerfen() {
    const ja = await bestaetigen(`${sendung.titel} verwerfen? Sie wird nicht mehr gesendet.`, {
      ja: "Verwerfen",
      nein: "Behalten",
      gefahr: true,
    });
    if (ja) await entfernen(sendung.id);
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-rand-ruhig bg-background px-3 py-3">
      <div>
        <p className="font-semibold">{sendung.titel}</p>
        <p className="text-sm text-muted">
          {sendungDatum(sendung)}
          {sendung.fotos > 0 && ` · ${sendung.fotos === 1 ? "1 Foto" : `${sendung.fotos} Fotos`}`}
        </p>
      </div>
      {sendung.fehler ? (
        <>
          <p role="alert" className="text-sm font-medium text-gefahr">
            Nicht angenommen: {sendung.fehler}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" groesse="mittel" onClick={() => void erneutVersuchen(sendung.id)}>
              Erneut senden
            </Button>
            {(sendung.art === "eintrag" || sendung.art === "sammel") && (
              <Button type="button" groesse="mittel" variant="secondary" onClick={oeffnen}>
                Ins Formular holen
              </Button>
            )}
            <Button type="button" groesse="mittel" variant="leiseGefahr" onClick={() => void verwerfen()}>
              Verwerfen
            </Button>
          </div>
          {sendung.fotos > 0 && (
            <p className="text-xs text-muted">Im Formular musst du die Fotos neu auswählen.</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-warnung">Wartet auf Senden</p>
          <Button type="button" groesse="mittel" variant="leiseGefahr" onClick={() => void verwerfen()}>
            Verwerfen
          </Button>
        </div>
      )}
    </li>
  );
}
