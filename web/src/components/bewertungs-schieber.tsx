"use client";

import { useId, useState } from "react";
import { AMPEL_TEXT } from "@/lib/ampel";
import {
  kriteriumEinstufung,
  stufeText,
  type BeurteilungsEinstufung,
  type BeurteilungsKriterium,
} from "@/components/stockkarten-eintrag-felder";

// Kräftige, gut leuchtende Farben, damit Gelb und Rot im Schein klar
// unterscheidbar bleiben.
const AKZENT_FARBEN: Record<BeurteilungsEinstufung, string> = {
  rot: "#ef4444",
  gelb: "#e5b000",
  gruen: "#22c55e",
};

// Textfarben für den gewählten Namen am Strahl (lesbar auf hell und dunkel).
const TEXT_FARBEN: Record<BeurteilungsEinstufung, string> = {
  rot: AMPEL_TEXT.gefahr,
  gelb: AMPEL_TEXT.warnung,
  gruen: AMPEL_TEXT.ok,
};

/// Position einer Note (1-6) auf dem Strahl in Prozent.
function prozent(note: number): number {
  return ((note - 1) / 5) * 100;
}

// Schieberegler für die Beurteilung in Noten von 1,0 (links, beste Stufe) bis
// 6,0 in halben Schritten. Die sechs Namen stehen direkt an den ganzen
// Noten, abwechselnd über und unter dem Strahl (sonst laufen sie am Handy
// ineinander); die halben Noten bleiben ohne Namen. Farbige Bänder zeigen,
// wo Gelb und Rot beginnen. Gespeichert wird die Note als Zahl.
//
// Startet grau/inaktiv und ohne Anfasser, solange noch kein bestehender Wert
// vorliegt. Scharf wird er erst, wenn er wirklich bewegt oder auf eine
// Position getippt wird - der Anfasser springt dann dorthin. Bloßes
// Berühren (etwa beim Scrollen über den Regler) oder Fokussieren setzt
// keinen Wert mehr; früher stand der Regler dabei schon auf der Mitte, und
// beim Gesamteindruck (dort schon gelb) kam ungewollt die Rückfrage
// "Auffällige Bewertung". Das X links vom Namen setzt einen versehentlich
// gesetzten Regler wieder zurück.
//
// Mit "vorwert" (neue Durchsicht, genau ein Volk) markiert ein grauer,
// gestrichelter Ring, wo die Wertung letztes Mal stand; liegt der Anfasser
// genau dort, umrahmt ihn ein größerer Ring. Solange der Regler noch nicht
// gesetzt ist, nennt zusätzlich eine Zeile den alten Wert mit Datum. Der
// Vorwert wird nie übernommen - gespeichert wird nur, was bewegt oder
// angetippt wurde.
export function BewertungsSchieber({
  name,
  kriterium,
  defaultValue,
  vorwert = null,
}: {
  name: string;
  kriterium: Pick<BeurteilungsKriterium, "label" | "stufen" | "gelbAb" | "rotAb">;
  defaultValue?: number | null;
  /// Letzte gesetzte Wertung dieses Volkes - nur zum Ansehen.
  vorwert?: { note: number; datum: Date } | null;
}) {
  const vorwertId = useId();
  const mitte = 3.5;
  const [wert, setWert] = useState(defaultValue ?? mitte);
  const [aktiv, setAktiv] = useState(defaultValue != null);

  const einstufung = aktiv ? kriteriumEinstufung(kriterium, wert) : null;
  const akzentFarbe = einstufung ? AKZENT_FARBEN[einstufung] : "var(--muted)";
  // Grün soll nur dezent bestätigen, inaktiv leuchtet der Regler gar nicht.
  const glowStaerke = !aktiv ? "0%" : einstufung === "gruen" ? "30%" : "70%";

  /// Tipp auf den Strahl, ohne dass sich der Wert ändert (der versteckte
  /// Anfasser stand zufällig schon dort): Position selbst ausrechnen.
  /// pointerup statt click: am Handy kommt bei unverändertem Wert kein
  /// click an. Beim Scrollen bricht der Browser die Berührung ab
  /// (pointercancel), dann gibt es kein pointerup und nichts wird gesetzt.
  function antippen(event: React.PointerEvent<HTMLInputElement>) {
    if (aktiv) return;
    const rahmen = event.currentTarget.getBoundingClientRect();
    // Der Anfasser (30 px) läuft 15 px innerhalb der Kanten.
    const anteil = (event.clientX - rahmen.left - 15) / Math.max(1, rahmen.width - 30);
    const note = Math.round((1 + Math.min(1, Math.max(0, anteil)) * 5) * 2) / 2;
    setWert(note);
    setAktiv(true);
  }

  function zuruecksetzen() {
    setAktiv(false);
    setWert(mitte);
  }

  function beschriftung(note: number) {
    const gewaehlt = aktiv && wert === note;
    const nachbar = aktiv && Math.abs(wert - note) === 0.5;
    const ausrichtung =
      note === 1 ? "left-0 text-left" : note === 6 ? "right-0 text-right" : "-translate-x-1/2 text-center";
    return (
      <span
        key={note}
        className={`absolute w-24 leading-tight ${ausrichtung} ${
          gewaehlt ? `font-bold ${einstufung ? TEXT_FARBEN[einstufung] : ""}` : nachbar ? "text-foreground" : ""
        }`}
        style={note === 1 || note === 6 ? undefined : { left: `${prozent(note)}%` }}
      >
        {kriterium.stufen[note - 1]}
      </span>
    );
  }

  const gleichWieVorwert = aktiv && vorwert !== null && wert === vorwert.note;
  const vorwertZeigen = vorwert !== null && !aktiv;

  const g = prozent(kriterium.gelbAb);
  const r = prozent(kriterium.rotAb);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        {aktiv && (
          <button
            type="button"
            onClick={zuruecksetzen}
            aria-label={`${kriterium.label} zurücksetzen`}
            title="Zurücksetzen (falls versehentlich angetippt)"
            className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
          >
            ✕
          </button>
        )}
        <label htmlFor={name} className="text-base font-semibold">
          {kriterium.label}
        </label>
      </div>

      {/* Namen der Noten 1, 3, 5 über dem Strahl */}
      <div className="relative mx-[15px] h-7 text-xs text-muted">
        <div className="absolute inset-x-0 bottom-0 flex items-end">{[1, 3, 5].map(beschriftung)}</div>
      </div>

      {/* Der Regler ist "block": als Inline-Element hinge unter ihm Platz für
          die Schriftunterlänge, der Streifen wäre höher als der Regler und
          "top-1/2" der Ringe läge ca. 3,5 px tiefer als die Mitte des
          Anfassers. */}
      <div className="relative">
        {/* Bänder und Striche liegen unter dem eigentlichen Regler; der
            Balken des Reglers selbst ist durchsichtig. */}
        <div className="pointer-events-none absolute inset-x-[15px] top-1/2 h-1.5 -translate-y-1/2">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: aktiv
                ? `linear-gradient(to right, ${AKZENT_FARBEN.gruen} 0 ${g}%, ${AKZENT_FARBEN.gelb} ${g}% ${r}%, ${AKZENT_FARBEN.rot} ${r}% 100%)`
                : "var(--rand-bedienung)",
              opacity: aktiv ? 0.45 : 1,
            }}
          />
          {Array.from({ length: 11 }, (_, i) => 1 + i / 2).map((note) => (
            <span
              key={note}
              className={`absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-muted ${
                note === Math.floor(note) ? "h-3.5 opacity-80" : "h-1 opacity-50"
              }`}
              style={{ left: `${prozent(note)}%` }}
            />
          ))}
          {/* Letzte Wertung: liegt unter dem Anfasser. Bei gleichem Wert
              ragt der größere Ring rundum über ihn hinaus. */}
          {vorwert && (
            <span
              title="Letztes Mal"
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-muted ${
                gleichWieVorwert ? "h-[38px] w-[38px]" : "h-6 w-6 bg-card"
              }`}
              style={{ left: `${prozent(vorwert.note)}%` }}
            />
          )}
        </div>
        <input
          id={name}
          name={aktiv ? name : undefined}
          type="range"
          min={1}
          max={6}
          step={0.5}
          value={wert}
          onChange={(event) => {
            setAktiv(true);
            setWert(Number(event.target.value));
          }}
          onPointerUp={antippen}
          aria-valuetext={aktiv ? stufeText(kriterium, wert) : "nicht bewertet"}
          aria-describedby={vorwertZeigen ? vorwertId : undefined}
          data-inaktiv={aktiv ? undefined : ""}
          className="bewertung-schieber relative block w-full"
          style={
            {
              "--schieber-akzent": akzentFarbe,
              "--schieber-glow-staerke": glowStaerke,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Namen der Noten 2, 4, 6 unter dem Strahl */}
      <div className="relative mx-[15px] h-7 text-xs text-muted">{[2, 4, 6].map(beschriftung)}</div>

      {!aktiv && <p className="text-center text-sm text-muted">Antippen zum Bewerten</p>}
      {vorwertZeigen && (
        <p id={vorwertId} className="mt-0.5 text-center text-sm text-muted">
          Letztes Mal: <span className="font-semibold text-foreground">{stufeText(kriterium, vorwert.note)}</span> (
          {vorwert.datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })})
        </p>
      )}
    </div>
  );
}
