"use client";

import { useTransition } from "react";
import { designSetzen } from "@/lib/design-actions";
import { DESIGNS, DESIGN_NAMEN, type Design } from "@/lib/design-namen";
import { IconHaken } from "@/components/icons";

// Farben der Mini-Vorschau je Design, hell und dunkel. Bewusst fest
// eingetragen (Werte aus globals.css): die Vorschau zeigt ja gerade die
// anderen Designs, deren Variablen auf dieser Seite nicht gelten.
type Farben = { grund: string; karte: string; rand: string; akzent: string; leise: string; kopf: string; honig: string };

const VORSCHAU: Record<Design, { hell: Farben; dunkel: Farben; text: string }> = {
  aktuell: {
    text: "Hell und frisch, Grün und Honiggelb. Seitenleiste links, am Handy Kacheln oben.",
    hell: { grund: "#f1f4f0", karte: "#ffffff", rand: "#e3e6e0", akzent: "#1f5c44", leise: "#b5bbb3", kopf: "#ffffff", honig: "#d4900f" },
    dunkel: { grund: "#14181a", karte: "#31373a", rand: "#41484a", akzent: "#e8a32c", leise: "#4d5651", kopf: "#31373a", honig: "#e8a32c" },
  },
  wabe: {
    text: "Warm, Waldgrün und Honig. Am Handy Leiste unten.",
    hell: { grund: "#f3f2ec", karte: "#fffefb", rand: "#e2ded3", akzent: "#1e4d3b", leise: "#cfc9bb", kopf: "#fffefb", honig: "#d4900f" },
    dunkel: { grund: "#15130f", karte: "#33302c", rand: "#49453e", akzent: "#f0b44a", leise: "#4a4337", kopf: "#33302c", honig: "#f0b44a" },
  },
  klar: {
    text: "Kühl, Petrol und dunkles Band oben. Listen und Tabellen.",
    hell: { grund: "#ffffff", karte: "#ffffff", rand: "#dfe4e7", akzent: "#0b6b74", leise: "#c3ccd1", kopf: "#0f2a30", honig: "#d99a16" },
    dunkel: { grund: "#0c1215", karte: "#272f32", rand: "#3a474e", akzent: "#5ec8cf", leise: "#33454e", kopf: "#081013", honig: "#f2b632" },
  },
};

// Schematische Mini-Seite: wo das Menü sitzt und wie die Farben wirken.
function Vorschau({ design, f }: { design: Design; f: Farben }) {
  const kachel = (breite: string) => (
    <div className="rounded-[3px] border p-1" style={{ background: f.karte, borderColor: f.rand }}>
      <div className="h-1 rounded-full" style={{ width: breite, background: f.akzent }} />
      <div className="mt-1 h-1 w-4/5 rounded-full" style={{ background: f.leise }} />
    </div>
  );
  const inhalt = (
    <div className="flex flex-1 flex-col gap-1 p-1.5">
      {kachel("55%")}
      {kachel("40%")}
      {kachel("50%")}
    </div>
  );
  return (
    <div aria-hidden="true" className="flex h-24 overflow-hidden rounded-md border" style={{ background: f.grund, borderColor: f.rand }}>
      {design === "aktuell" && (
        <>
          <div className="flex w-1/4 flex-col gap-1 border-r p-1.5" style={{ background: f.kopf, borderColor: f.rand }}>
            <div className="h-1.5 w-3/4 rounded-full" style={{ background: f.akzent }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1 rounded-full" style={{ background: i === 0 ? f.akzent : f.leise, opacity: i === 0 ? 0.5 : 1 }} />
            ))}
          </div>
          {inhalt}
        </>
      )}
      {design === "wabe" && (
        <div className="flex flex-1 flex-col">
          {inhalt}
          <div className="flex items-end justify-around border-t px-1 pb-1 pt-0.5" style={{ background: f.kopf, borderColor: f.rand }}>
            <div className="h-1.5 w-3 rounded-full" style={{ background: f.honig, opacity: 0.6 }} />
            <div className="h-1.5 w-3 rounded-full" style={{ background: f.leise }} />
            <div className="-mt-2 h-3.5 w-3.5 rounded-[4px]" style={{ background: f.akzent }} />
            <div className="h-1.5 w-3 rounded-full" style={{ background: f.leise }} />
            <div className="h-1.5 w-3 rounded-full" style={{ background: f.leise }} />
          </div>
        </div>
      )}
      {design === "klar" && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-1 px-1.5 py-1.5" style={{ background: f.kopf }}>
            <div className="h-1.5 w-5 rounded-full" style={{ background: f.honig }} />
            <div className="h-1 w-3 rounded-full bg-white/50" />
            <div className="h-1 w-3 rounded-full bg-white/30" />
            <div className="ml-auto h-2 w-3 rounded-[2px]" style={{ background: f.honig }} />
          </div>
          {inhalt}
        </div>
      )}
    </div>
  );
}

// Auswahl des Gesamt-Designs (jedes Konto, Einstellungen -> Design). Gilt für
// diesen Browser. Hell/Dunkel bleibt davon getrennt im Menü.
export function DesignWahl({ design }: { design: Design }) {
  const [laeuft, starten] = useTransition();
  return (
    <div role="radiogroup" aria-label="Design wählen" className={`grid gap-3 sm:grid-cols-3 ${laeuft ? "opacity-60" : ""}`}>
      {DESIGNS.map((wert) => {
        const aktiv = wert === design;
        return (
          <button
            key={wert}
            type="button"
            role="radio"
            aria-checked={aktiv}
            disabled={laeuft}
            onClick={() => !aktiv && starten(() => designSetzen(wert))}
            className={`flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-card p-3 text-left ${
              aktiv ? "border-accent ring-2 ring-accent" : "border-rand-ruhig hover:border-accent"
            }`}
          >
            <div className="dark:hidden">
              <Vorschau design={wert} f={VORSCHAU[wert].hell} />
            </div>
            <div className="hidden dark:block">
              <Vorschau design={wert} f={VORSCHAU[wert].dunkel} />
            </div>
            <span className="flex items-center gap-2 font-semibold">
              {DESIGN_NAMEN[wert]}
              {aktiv && <IconHaken className="ml-auto h-5 w-5 text-accent" />}
            </span>
            <span className="text-sm text-muted">{VORSCHAU[wert].text}</span>
          </button>
        );
      })}
    </div>
  );
}
