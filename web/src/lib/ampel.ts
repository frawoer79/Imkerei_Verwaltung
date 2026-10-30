// Ampelfarben der Oberfläche: grün = in Ordnung, gelb = Vorsicht, rot = Gefahr
// bzw. überfällig. Die Farben selbst stehen als Variablen in globals.css
// (--ok, --warnung, --gefahr samt -flaeche und -rand) und wechseln dort
// zwischen hell und dunkel - hier nur die fertigen Tailwind-Klassen, damit
// überall dieselbe Farbe dasselbe bedeutet und kein "dark:" mehr nötig ist.

export type Ampel = "ok" | "warnung" | "gefahr";

/** Schriftfarbe (mind. 4,5:1 auf Karte und auf der eigenen Fläche). */
export const AMPEL_TEXT: Record<Ampel, string> = {
  ok: "text-ok",
  warnung: "text-warnung",
  gefahr: "text-gefahr",
};

/** Fläche samt Rand, z.B. für Hinweiskästen und Plaketten. */
export const AMPEL_FLAECHE: Record<Ampel, string> = {
  ok: "border-ok-rand bg-ok-flaeche",
  warnung: "border-warnung-rand bg-warnung-flaeche",
  gefahr: "border-gefahr-rand bg-gefahr-flaeche",
};

/** Einstufung einer Bewertung (rot/gelb/grün) auf die Ampel abgebildet. */
export const EINSTUFUNG_AMPEL = { rot: "gefahr", gelb: "warnung", gruen: "ok" } as const;

/** Gefüllte Plakette (Gesamteindruck): Füllung, Schrift und Rand je Stufe. */
export const AMPEL_VOLL: Record<Ampel, string> = {
  ok: "border-ok-voll bg-ok-voll text-ok-voll-text",
  warnung: "border-warnung-voll-rand bg-warnung-voll text-warnung-voll-text",
  gefahr: "border-gefahr-voll bg-gefahr-voll text-gefahr-voll-text",
};
