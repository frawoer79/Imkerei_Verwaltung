"use client";

import { Fragment, useEffect, useImperativeHandle, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow, usePathname, useRouter } from "next/navigation";
import { Button, Input, Label, LinkKnopf } from "@/components/ui";
import { FormularKontext, speicherFehlerTitel } from "@/components/sicheres-formular";
import { bestaetigen } from "@/lib/bestaetigen";
import {
  ENTWURF_ABGELEGT,
  type Entwurf,
  type EntwurfWerte,
  entwurfAlsWerte,
  entwurfLesen,
  entwurfLoeschen,
  entwurfSchreiben,
  entwurfZeitpunkt,
  formularFelder,
} from "@/lib/entwurf";
import type { FormularErgebnis } from "@/lib/actions";
import {
  type SendeErgebnis,
  type SendungArt,
  anzeigen,
  einreihen,
  entfernen,
  ergebnisVermerken,
  laufendSetzen,
  senden,
  sendungAusFormular,
} from "@/lib/warteschlange";
import {
  BEURTEILUNGS_KRITERIEN,
  KOENIGINS_BEURTEILUNGS_KRITERIEN,
  kriteriumEinstufung,
  istAuffaellig,
  stufeText,
} from "@/components/stockkarten-eintrag-felder";

type Auffaelligkeit = { label: string; text: string; vorschlag?: string };

// Haken, die wie eine rote Bewertung die Frage nach einer Maßnahme auslösen -
// mit einem Vorschlag fürs Textfeld.
const AUFFAELLIGE_HAKEN = [
  { name: "drohnenbruetig", label: "Drohnenbrütig", vorschlag: "Volk auflösen oder umweiseln" },
  { name: "abgeschwaermt", label: "Abgeschwärmt", vorschlag: "Nachschau: Weiselzellen ausbrechen, Jungkönigin prüfen" },
];
type Schritt = "massnahme" | "koenigin" | "lager" | "speichern" | "gespeichert" | "wartet" | "fehler";

/// Für den Dialog, in dem das Formular steckt: vor dem Schließen ("✕",
/// Escape) nachfragen, wenn schon etwas eingegeben ist.
export type EintragSteuerung = {
  /// true = darf schließen (nichts eingegeben oder "Verwerfen" gewählt).
  schliessenPruefen: () => Promise<boolean>;
};

// Spätestens so lange nach der letzten Eingabe liegt der Entwurf auf dem Gerät.
const ENTWURF_TAKT_MS = 1000;
// Kommt so lange keine Antwort, darf man im Hintergrund weitersenden lassen.
const LANGSAM_MS = 8000;

/// Text im Popup, wenn die Durchsicht in der Warteschlange liegt.
const WARTE_TEXT: Record<Exclude<SendeErgebnis["art"], "ok" | "abgelehnt">, string> = {
  keinNetz: "Kein Netz. Die Durchsicht wird von selbst gesendet, sobald wieder Verbindung da ist.",
  serverfehler: "Der Server hat einen Fehler gemeldet. Die App versucht es gleich von selbst noch einmal.",
  abgemeldet: "Du bist abgemeldet. Melde dich wieder an, dann wird die Durchsicht gesendet.",
};

/// Vergleichbarer Inhalt des Formulars. Die gewählten Völker eines
/// Sammel-Eintrags zählen nicht als "etwas eingegeben".
function vergleichsText(formular: HTMLFormElement): string {
  return JSON.stringify(formularFelder(new FormData(formular)).filter(([name]) => name !== "volkIds"));
}

// Prüft beim Absenden, ob eine der Beurteilungs-Bewertungen auffällig
// (gelb/rot) ist oder Drohnenbrütig/Abgeschwärmt angehakt ist - wenn ja, wird
// das Speichern kurz angehalten und gefragt, ob dazu gleich eine Maßnahme
// angelegt werden soll.
function auffaelligkeitenErmitteln(formData: FormData): Auffaelligkeit[] {
  const haken = AUFFAELLIGE_HAKEN.filter((eintrag) => formData.get(eintrag.name)?.toString() === "ja").map(
    (eintrag) => ({ label: eintrag.label, text: "", vorschlag: eintrag.vorschlag })
  );
  const bewertungen = BEURTEILUNGS_KRITERIEN.flatMap((kriterium) => {
    const roh = formData.get(kriterium.feld);
    const wert = roh ? Number(roh) : null;
    const einstufung = kriteriumEinstufung(kriterium, wert);
    if (!istAuffaellig(einstufung) || wert == null) return [];
    // Nur der Wortlaut, keine Note - die bleibt im Hintergrund.
    return [{ label: kriterium.label, text: stufeText(kriterium, wert) }];
  });
  return [...haken, ...bewertungen];
}

/// Gibt es überhaupt eine Beurteilung oder einen dokumentierten Honigertrag,
/// die/den man zur Königin übernehmen könnte? Nur die Kriterien, die
/// tatsächlich in ihre Bewertung eingehen - Futtermenge und Gesamteindruck
/// allein lösen die Frage nicht mehr aus.
function hatBeurteilung(formData: FormData): boolean {
  const kriteriumGefuellt = KOENIGINS_BEURTEILUNGS_KRITERIEN.some((kriterium) => {
    const roh = formData.get(kriterium.feld);
    return roh !== null && roh !== "" && Number(roh) > 0;
  });
  if (kriteriumGefuellt) return true;
  return formData.get("honigGeerntet")?.toString() === "ja";
}

/// Geschätzte Erntemenge, wie sie dem Formular gerade bekannt ist - entweder
/// die clientseitige Vorschau aus dem Zargen-/Wabenformular oder, wenn nichts
/// davon erfasst wurde, die von Hand eingetippte Menge.
function geschaetzteHonigmenge(formData: FormData): number | null {
  const roh = formData.get("honigMengeGeschaetzt") ?? formData.get("honigertragKg");
  if (roh === null) return null;
  const zahl = Number(roh.toString().replace(",", "."));
  return Number.isFinite(zahl) && zahl > 0 ? zahl : null;
}

export function StockkartenEintragFormular({
  action,
  children,
  className,
  koeniginKennung = null,
  istNeuerEintrag = false,
  lagerAn = true,
  entwurfSchluessel,
  warteschlange,
  beiWiederherstellen,
  beiVerwerfen,
  steuerung,
}: {
  action: (formData: FormData) => Promise<FormularErgebnis>;
  /// Entweder fester Inhalt (Bearbeiten-Seite) oder eine Funktion, die den
  /// Inhalt aus einem wiederhergestellten Entwurf neu aufbaut.
  children: React.ReactNode | ((entwurf: EntwurfWerte | null) => React.ReactNode);
  className?: string;
  /// Schlüssel für den Entwurf auf dem Gerät (siehe lib/entwurf.ts). Ohne
  /// ihn wird nichts gesichert - so beim Bearbeiten eines Eintrags.
  entwurfSchluessel?: string;
  /// Neue Durchsicht: Klappt das Senden nicht, kommt sie in die Warteschlange
  /// auf dem Gerät und wird von selbst nachgesendet (lib/warteschlange.ts).
  /// Ohne Angabe (Bearbeiten-Seite) wird über die Server-Aktion gespeichert.
  warteschlange?: { art: SendungArt; ziel: string; titel: string };
  /// Nach "Weiter ausfüllen" - z.B. um beim Sammel-Eintrag die damals
  /// gewählten Völker wieder auszuwählen.
  beiWiederherstellen?: (entwurf: EntwurfWerte) => void;
  /// Nach "Verwerfen" (Hinweis oben oder Rückfrage beim Schließen).
  beiVerwerfen?: () => void;
  steuerung?: React.Ref<EintragSteuerung>;
  /// Kennung der Königin, die gerade im Volk sitzt. Nur dann wird beim
  /// Speichern gefragt, ob die Beurteilung auch zu ihr soll.
  koeniginKennung?: string | null;
  /// Nur beim Neuanlegen wird nach einer Honigernte gefragt, ob sie ins
  /// Erzeugnis-Lager gebucht werden soll - beim Bearbeiten eines
  /// bestehenden Eintrags würde jedes erneute Speichern sonst eine weitere
  /// Buchung anlegen und den Bestand verdoppeln.
  istNeuerEintrag?: boolean;
  /// Bereich "Lager" eingeschaltet? Sonst entfällt die Frage nach der Lagerbuchung.
  lagerAn?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formDataRef = useRef<FormData | null>(null);
  const [schritte, setSchritte] = useState<Schritt[]>([]);
  const [schrittIndex, setSchrittIndex] = useState(0);
  const [auffaelligkeiten, setAuffaelligkeiten] = useState<Auffaelligkeit[]>([]);
  const [massnahmeErweitert, setMassnahmeErweitert] = useState(false);
  const [massnahmeText, setMassnahmeText] = useState("");
  const [massnahmeFaellig, setMassnahmeFaellig] = useState("");
  const [lagerMenge, setLagerMenge] = useState("");
  const [lagerErweitert, setLagerErweitert] = useState(false);
  const [speichertGerade, startTransition] = useTransition();
  // Rückgabe der Server-Aktion (Prüffehler) - steht rot über dem Knopf.
  const [fehler, setFehler] = useState<string | null>(null);
  // Anfrage gescheitert (Funkloch, Server weg) - Titel des Fehler-Popups.
  const [speicherFehler, setSpeicherFehler] = useState("");
  const [entwurfGesichert, setEntwurfGesichert] = useState(false);
  // Warteschlange: Grund, warum die Durchsicht noch auf dem Gerät liegt, und
  // ob die Antwort schon so lange dauert, dass man weitermachen darf.
  const [warteGrund, setWarteGrund] = useState<keyof typeof WARTE_TEXT>("keinNetz");
  const [langsam, setLangsam] = useState(false);
  const hintergrundRef = useRef(false);
  const sendungIdRef = useRef<string | null>(null);
  const router = useRouter();
  const pfad = usePathname();

  // --- Entwurf auf dem Gerät ----------------------------------------------
  // Beim Laden gefundener Entwurf, über den noch nicht entschieden ist.
  // Solange er angezeigt wird, sichert das Formular nichts, damit er nicht
  // vom leeren Formular überschrieben wird.
  const [alterEntwurf, setAlterEntwurf] = useState<Entwurf | null>(null);
  const [wiederhergestellt, setWiederhergestellt] = useState<EntwurfWerte | null>(null);
  // Steigt bei "Weiter ausfüllen" und "Verwerfen": baut den Inhalt neu auf.
  const [fassung, setFassung] = useState(0);
  const basisRef = useRef<string | null>(null);
  const taktRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gefundenRef = useRef(false);
  const fertigRef = useRef(false);

  useEffect(() => {
    // Leerer Ausgangszustand zum Vergleichen, ob schon etwas eingegeben ist.
    if (formRef.current) basisRef.current = vergleichsText(formRef.current);
    if (!entwurfSchluessel) return;
    const entwurf = entwurfLesen(entwurfSchluessel);
    gefundenRef.current = entwurf !== null;
    // Erst nach dem ersten Zeichnen lesbar (localStorage gibt es nur im
    // Browser) - darum hier und nicht als Startwert des Zustands.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlterEntwurf(entwurf);
    // Aus der Warteschlange zurückgeholt, während das Formular schon da ist.
    function abgelegt(ereignis: Event) {
      if (!entwurfSchluessel || (ereignis as CustomEvent<string>).detail !== entwurfSchluessel) return;
      const neu = entwurfLesen(entwurfSchluessel);
      gefundenRef.current = neu !== null;
      setAlterEntwurf(neu);
    }
    window.addEventListener(ENTWURF_ABGELEGT, abgelegt);
    return () => {
      window.removeEventListener(ENTWURF_ABGELEGT, abgelegt);
      if (taktRef.current) clearTimeout(taktRef.current);
    };
  }, [entwurfSchluessel]);

  function hatEingaben(): boolean {
    return formRef.current !== null && basisRef.current !== null && vergleichsText(formRef.current) !== basisRef.current;
  }

  /// Formularinhalt jetzt sichern - oder einen Entwurf entfernen, wenn das
  /// Formular wieder leer ist. Liefert, ob die Eingaben auf dem Gerät liegen.
  function entwurfSichern(): boolean {
    if (!entwurfSchluessel || !formRef.current || gefundenRef.current || fertigRef.current) return false;
    if (!hatEingaben()) {
      entwurfLoeschen(entwurfSchluessel);
      return false;
    }
    return entwurfSchreiben(entwurfSchluessel, formularFelder(new FormData(formRef.current)));
  }

  // Bei jeder Änderung (auch Plus/Minus-Knöpfe, die kein input-Ereignis
  // auslösen) höchstens einmal je Takt sichern.
  function entwurfVormerken() {
    if (!entwurfSchluessel || taktRef.current) return;
    taktRef.current = setTimeout(() => {
      taktRef.current = null;
      entwurfSichern();
    }, ENTWURF_TAKT_MS);
  }

  function entwurfUebernehmen() {
    if (!alterEntwurf) return;
    const werte = entwurfAlsWerte(alterEntwurf);
    gefundenRef.current = false;
    setAlterEntwurf(null);
    setWiederhergestellt(werte);
    setFassung((alt) => alt + 1);
    beiWiederherstellen?.(werte);
  }

  function entwurfVerwerfen() {
    if (entwurfSchluessel) entwurfLoeschen(entwurfSchluessel);
    gefundenRef.current = false;
    setAlterEntwurf(null);
    setWiederhergestellt(null);
    setFehler(null);
    setFassung((alt) => alt + 1);
    beiVerwerfen?.();
  }

  useImperativeHandle(steuerung, () => ({
    async schliessenPruefen() {
      if (!hatEingaben()) return true;
      const verwerfen = await bestaetigen("Durchsicht verwerfen? Deine Eingaben gehen verloren.", {
        ja: "Verwerfen",
        nein: "Weiter ausfüllen",
        gefahr: true,
      });
      if (verwerfen) entwurfVerwerfen();
      return verwerfen;
    },
  }));

  // Ist das Speichern durch (Seite neu geladen oder Fehler), schließt sich
  // der "Wird gespeichert"-Hinweis wieder.
  useEffect(() => {
    if (!speichertGerade && schritte[schrittIndex] === "speichern") dialogRef.current?.close();
  }, [speichertGerade, schritte, schrittIndex]);

  /// Tatsächlich speichern. Bis die Seite neu geladen ist, bleibt ein
  /// Hinweis stehen - sonst sah das Formular nach den Rückfragen gerade bei
  /// langsamem Netz so aus, als wäre nichts passiert, und ein zweites
  /// "Speichern" hätte den Eintrag doppelt angelegt.
  //
  // Neue Durchsichten gehen über die Warteschlange (mitWarteschlangeSpeichern):
  // scheitert das Senden, liegen sie samt Fotos auf dem Gerät und werden von
  // selbst nachgesendet. Beim Bearbeiten (direktSpeichern) ersetzt bei einem
  // Fehler keine Fehlerseite das Formular: das Popup zeigt eine Meldung, die
  // Eingaben bleiben stehen.
  function speichern(formData: FormData) {
    if (taktRef.current) {
      clearTimeout(taktRef.current);
      taktRef.current = null;
    }
    setEntwurfGesichert(entwurfSichern());
    setFehler(null);
    setSchritte(["speichern"]);
    setSchrittIndex(0);
    formDataRef.current = formData;
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    if (warteschlange) {
      startTransition(() => mitWarteschlangeSpeichern(formData, warteschlange));
      return;
    }
    startTransition(() => direktSpeichern(formData));
  }

  /// Über die Server-Aktion speichern - beim Bearbeiten, oder wenn das Gerät
  /// keine Warteschlange kann.
  async function direktSpeichern(formData: FormData) {
    try {
      const ergebnis = await action(formData);
      if (ergebnis && ergebnis.fehler) {
        setFehler(ergebnis.fehler);
        return;
      }
      if (entwurfSchluessel) entwurfLoeschen(entwurfSchluessel);
    } catch (ausnahme) {
      try {
        unstable_rethrow(ausnahme);
      } catch (weiterleitung) {
        // Gespeichert, Next.js leitet auf die Volk- oder Stand-Seite weiter.
        fertigRef.current = true;
        if (entwurfSchluessel) entwurfLoeschen(entwurfSchluessel);
        throw weiterleitung;
      }
      setSpeicherFehler(speicherFehlerTitel(ausnahme));
      setSchritte(["fehler"]);
      setSchrittIndex(0);
    }
  }

  /// Neue Durchsicht: erst sicher auf dem Gerät ablegen, dann senden. So geht
  /// nichts verloren, auch wenn der Tab mitten im Senden geschlossen wird.
  async function mitWarteschlangeSpeichern(
    formData: FormData,
    angaben: { art: SendungArt; ziel: string; titel: string }
  ) {
    const sendung = sendungAusFormular(formData, angaben);
    sendungIdRef.current = sendung.id;
    laufendSetzen(sendung.id, true);
    if (!(await einreihen(sendung))) {
      laufendSetzen(sendung.id, false);
      await direktSpeichern(formData);
      return;
    }
    // Ab hier liegt die Durchsicht in der Warteschlange, der Entwurf ist
    // überflüssig.
    if (entwurfSchluessel) entwurfLoeschen(entwurfSchluessel);
    hintergrundRef.current = false;
    setLangsam(false);
    const uhr = setTimeout(() => setLangsam(true), LANGSAM_MS);
    const ergebnis = await senden(sendung);
    clearTimeout(uhr);
    laufendSetzen(sendung.id, false);

    if (hintergrundRef.current) {
      // Schon weitergemacht: nur noch festhalten, was daraus wurde. Die
      // Leiste oben zeigt es an und lädt die Seite bei Erfolg neu.
      await ergebnisVermerken(sendung, ergebnis);
      return;
    }
    if (ergebnis.art === "ok") {
      fertigRef.current = true;
      await entfernen(sendung.id);
      // Der Hinweis bleibt stehen, bis die Seite neu aufgebaut ist - sonst
      // könnte ein zweites "Speichern" den Eintrag doppelt anlegen.
      setSchritte(["gespeichert"]);
      if (ergebnis.ziel === pfad) router.refresh();
      else router.push(ergebnis.ziel);
      return;
    }
    if (ergebnis.art === "abgelehnt") {
      // Prüffehler: Nochmal senden hilft nicht. Raus aus der Warteschlange,
      // die Meldung steht rot im Formular, die Eingaben wieder im Entwurf.
      await entfernen(sendung.id);
      formData.delete("sendungId");
      setFehler(ergebnis.fehler);
      setEntwurfGesichert(entwurfSichern());
      return;
    }
    if (ergebnis.art === "serverfehler") await ergebnisVermerken(sendung, ergebnis);
    setWarteGrund(ergebnis.art);
    setSchritte(["wartet"]);
    setSchrittIndex(0);
  }

  /// Popup und Dialog schließen und mit einem leeren Formular weitermachen -
  /// die Durchsicht liegt in der Warteschlange.
  function weitermachen() {
    dialogRef.current?.close();
    formRef.current?.closest("dialog")?.close();
    setWiederhergestellt(null);
    setFehler(null);
    setFassung((alt) => alt + 1);
    formDataRef.current = null;
  }

  /// Langsames Netz: nicht länger warten, die Warteschlange übernimmt.
  function imHintergrundSenden() {
    hintergrundRef.current = true;
    if (sendungIdRef.current) anzeigen(sendungIdRef.current);
    weitermachen();
  }

  function erneutSpeichern() {
    if (formDataRef.current) speichern(formDataRef.current);
  }

  /// "Schließen, später senden": Fehler-Popup und den Dialog drumherum
  /// schließen. Die Eingaben bleiben im Formular und im Entwurf.
  function spaeterSenden() {
    dialogRef.current?.close();
    formRef.current?.closest("dialog")?.close();
  }

  function beiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (speichertGerade) return;
    // Ein noch offener Hinweis auf einen alten Entwurf gilt als verworfen,
    // sobald dieser neue Eintrag gespeichert wird.
    if (alterEntwurf) {
      gefundenRef.current = false;
      setAlterEntwurf(null);
    }
    const formData = new FormData(event.currentTarget);
    const gefunden = auffaelligkeitenErmitteln(formData);
    const koeniginFrage = koeniginKennung !== null && hatBeurteilung(formData);
    const honigMenge = geschaetzteHonigmenge(formData);
    const lagerFrage =
      istNeuerEintrag && lagerAn && formData.get("honigGeerntet")?.toString() === "ja" && honigMenge !== null;

    const neueSchritte: Schritt[] = [
      ...(gefunden.length > 0 ? (["massnahme"] as const) : []),
      ...(koeniginFrage ? (["koenigin"] as const) : []),
      ...(lagerFrage ? (["lager"] as const) : []),
    ];
    if (neueSchritte.length === 0) {
      speichern(formData);
      return;
    }

    formDataRef.current = formData;
    setAuffaelligkeiten(gefunden);
    setMassnahmeErweitert(false);
    setMassnahmeText("");
    setMassnahmeFaellig("");
    setLagerErweitert(false);
    setLagerMenge(honigMenge !== null ? honigMenge.toString() : "");
    setSchritte(neueSchritte);
    setSchrittIndex(0);
    dialogRef.current?.showModal();
  }

  /// Zum nächsten Schritt im Dialog - oder, wenn es keinen weiteren gibt,
  /// tatsächlich speichern.
  function weiter() {
    if (schrittIndex + 1 < schritte.length) {
      setSchrittIndex(schrittIndex + 1);
      return;
    }
    if (formDataRef.current) speichern(formDataRef.current);
  }

  function mitMassnahmeSpeichern() {
    const formData = formDataRef.current;
    if (!formData) return;
    if (massnahmeText.trim()) {
      formData.set("massnahmePopupText", massnahmeText.trim());
      if (massnahmeFaellig) formData.set("massnahmePopupFaelligAm", massnahmeFaellig);
    }
    weiter();
  }

  function mitBewertungSpeichern(zurKoenigin: boolean) {
    const formData = formDataRef.current;
    if (!formData) return;
    if (zurKoenigin) formData.set("bewertungZuKoenigin", "ja");
    weiter();
  }

  function mitLagerbuchungSpeichern() {
    const formData = formDataRef.current;
    if (!formData || !lagerMenge.trim()) return;
    formData.set("lagerZugangJa", "ja");
    formData.set("lagerZugangMengeKg", lagerMenge.trim());
    weiter();
  }

  const schritt = schritte[schrittIndex];

  return (
    <FormularKontext.Provider value={{ fehler, sendetGerade: speichertGerade }}>
      <form
        ref={formRef}
        action={action as (formData: FormData) => Promise<void>}
        onSubmit={beiSubmit}
        onInput={entwurfVormerken}
        onChange={entwurfVormerken}
        onClick={entwurfVormerken}
        className={className}
      >
        {alterEntwurf && (
          <div className="flex flex-col gap-3 rounded-md border border-accent bg-background px-3 py-3 text-sm">
            <p className="font-semibold">Ungespeicherte Durchsicht vom {entwurfZeitpunkt(alterEntwurf)} gefunden.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={entwurfUebernehmen}>
                Weiter ausfüllen
              </Button>
              <Button type="button" variant="secondary" onClick={entwurfVerwerfen}>
                Verwerfen
              </Button>
            </div>
            <p className="text-xs text-muted">Fotos bitte erneut auswählen.</p>
          </div>
        )}
        {wiederhergestellt && (
          <p className="text-xs text-muted">Entwurf übernommen. Fotos bitte erneut auswählen.</p>
        )}
        <Fragment key={fassung}>{typeof children === "function" ? children(wiederhergestellt) : children}</Fragment>
      </form>

      <dialog
        ref={dialogRef}
        className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-5">
          {schritt === "fehler" ? (
            <div role="alert" className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{speicherFehler}</h2>
              <p className="text-sm text-muted">
                {entwurfGesichert
                  ? "Deine Eingaben sind auf diesem Handy gesichert. Versuch es gleich noch einmal."
                  : "Deine Eingaben stehen noch im Formular. Versuch es gleich noch einmal."}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={spaeterSenden}>
                  {entwurfGesichert ? "Schließen, später senden" : "Schließen"}
                </Button>
                <Button type="button" onClick={erneutSpeichern}>
                  Erneut speichern
                </Button>
              </div>
            </div>
          ) : schritt === "wartet" ? (
            <div role="alert" className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Auf dem Handy gesichert</h2>
              <p className="text-sm text-muted">{WARTE_TEXT[warteGrund]}</p>
              <p className="text-sm text-muted">Oben siehst du, was noch wartet. Du kannst weitermachen.</p>
              <div className="flex flex-wrap justify-end gap-2">
                {warteGrund === "abgemeldet" && (
                  <LinkKnopf variant="secondary" href={`/login?weiter=${encodeURIComponent(pfad)}`}>
                    Anmelden
                  </LinkKnopf>
                )}
                <Button type="button" onClick={weitermachen} autoFocus>
                  OK
                </Button>
              </div>
            </div>
          ) : schritt === "speichern" || schritt === "gespeichert" ? (
            <div role="status" className="flex flex-col gap-4 py-2">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
                />
                <p className="text-base font-medium">
                  {schritt === "gespeichert" ? "Gespeichert, Seite wird geladen …" : "Durchsicht wird gespeichert …"}
                </p>
              </div>
              {schritt === "speichern" && langsam && warteschlange && (
                <>
                  <p className="text-sm text-muted">
                    Das Netz ist langsam. Die Durchsicht ist auf dem Handy gesichert und kommt auch an, wenn du
                    weitermachst.
                  </p>
                  <Button type="button" variant="secondary" onClick={imHintergrundSenden}>
                    Weitermachen, im Hintergrund senden
                  </Button>
                </>
              )}
            </div>
          ) : schritt === "koenigin" ? (
            <>
              <h2 className="text-lg font-semibold">Bewertung zur Königin?</h2>
              <p className="text-sm text-muted">
                Sanftmut, Schwarmtrieb, Wabensitz und Co. hängen an der Genetik der Königin.
                Soll die Bewertung dieser Durchsicht auch im Lebenslauf von{" "}
                <span className="font-medium text-foreground">{koeniginKennung}</span> stehen?
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => mitBewertungSpeichern(false)}>
                  Nein
                </Button>
                <Button type="button" onClick={() => mitBewertungSpeichern(true)}>
                  Ja
                </Button>
              </div>
            </>
          ) : schritt === "lager" ? (
            <>
              <h2 className="text-lg font-semibold">Honig ins Lager buchen?</h2>
              <p className="text-sm text-muted">
                Soll dieser Ertrag gleich als Zugang im Honig-Bestand der{" "}
                <Link href="/lager/erzeugnisse" className="text-accent hover:underline">
                  Lagerverwaltung
                </Link>{" "}
                gebucht werden?
              </p>

              {lagerErweitert && (
                <div>
                  <Label htmlFor="popup-lager-menge">Menge (kg)</Label>
                  <Input
                    id="popup-lager-menge"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={lagerMenge}
                    onChange={(event) => setLagerMenge(event.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                {!lagerErweitert ? (
                  <>
                    <Button type="button" variant="secondary" onClick={weiter}>
                      Nein
                    </Button>
                    <Button type="button" onClick={() => setLagerErweitert(true)}>
                      Ja, buchen
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={mitLagerbuchungSpeichern}
                    disabled={!lagerMenge.trim()}
                  >
                    Speichern
                  </Button>
                )}
              </div>
            </>
          ) : (
          <>
          <h2 className="text-lg font-semibold">Auffällige Bewertung</h2>
          <ul className="list-inside list-disc text-sm text-muted">
            {auffaelligkeiten.map((auffaelligkeit) => (
              <li key={auffaelligkeit.label}>
                {auffaelligkeit.label}
                {auffaelligkeit.text && `: ${auffaelligkeit.text}`}
              </li>
            ))}
          </ul>
          <p className="text-sm">Möchtest du dazu gleich eine Maßnahme anlegen?</p>

          {massnahmeErweitert && (
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="popup-massnahme-text">Maßnahme</Label>
                <Input
                  id="popup-massnahme-text"
                  value={massnahmeText}
                  onChange={(event) => setMassnahmeText(event.target.value)}
                  placeholder="z.B. Königin im Auge behalten"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="popup-massnahme-faellig">Fällig am</Label>
                <Input
                  id="popup-massnahme-faellig"
                  type="date"
                  value={massnahmeFaellig}
                  onChange={(event) => setMassnahmeFaellig(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!massnahmeErweitert ? (
              <>
                <Button type="button" variant="secondary" onClick={weiter}>
                  Nein
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setMassnahmeText(
                      auffaelligkeiten.flatMap((auffaelligkeit) => auffaelligkeit.vorschlag ?? []).join("; ")
                    );
                    setMassnahmeErweitert(true);
                  }}
                >
                  Ja, Maßnahme anlegen
                </Button>
              </>
            ) : (
              <Button type="button" onClick={mitMassnahmeSpeichern} disabled={!massnahmeText.trim()}>
                {schrittIndex + 1 < schritte.length ? "Weiter" : "Speichern"}
              </Button>
            )}
          </div>
          </>
          )}
        </div>
      </dialog>
    </FormularKontext.Provider>
  );
}
