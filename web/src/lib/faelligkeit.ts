import { AMPEL_TEXT } from "@/lib/ampel";

// Wie dringend ist eine Maßnahme? Einheitlich für Liste und Übersicht, damit
// überall dieselbe Farbe dasselbe bedeutet.

export type Faelligkeit = "ueberfaellig" | "heute" | "bald" | "spaeter" | "ohne";

/** Tage bis zum Termin, ab denen "bald" gilt. */
const BALD_TAGE = 7;

export function faelligkeitBestimmen(
  faelligAm: Date | null | undefined,
  heute: Date
): Faelligkeit {
  if (!faelligAm) return "ohne";

  const tagesbeginn = (datum: Date) =>
    new Date(datum.getFullYear(), datum.getMonth(), datum.getDate()).getTime();
  const tage = Math.round(
    (tagesbeginn(faelligAm) - tagesbeginn(heute)) / (24 * 60 * 60 * 1000)
  );

  if (tage < 0) return "ueberfaellig";
  if (tage === 0) return "heute";
  if (tage <= BALD_TAGE) return "bald";
  return "spaeter";
}

/** Rahmen und Hintergrund der Zeile. */
export const FAELLIGKEIT_RAHMEN: Record<Faelligkeit, string> = {
  ueberfaellig: "border-gefahr-rand bg-gefahr-flaeche",
  heute: "border-warnung-rand bg-warnung-flaeche",
  bald: "border-accent/40 bg-accent/10",
  spaeter: "border-border bg-background",
  ohne: "border-border bg-background",
};

/** Farbe der Datumszeile. */
export const FAELLIGKEIT_TEXT: Record<Faelligkeit, string> = {
  ueberfaellig: `font-medium ${AMPEL_TEXT.gefahr}`,
  heute: `font-medium ${AMPEL_TEXT.warnung}`,
  bald: "text-accent",
  spaeter: "text-muted",
  ohne: "text-muted",
};

export function faelligkeitText(faelligkeit: Faelligkeit, datumText: string): string {
  switch (faelligkeit) {
    case "ueberfaellig":
      return `Überfällig seit ${datumText}`;
    case "heute":
      return "Heute fällig";
    default:
      return `Fällig: ${datumText}`;
  }
}

// Offene Maßnahmen als Kärtchen (Maßnahmen-Seite, Karte auf der Volk-Seite):
// weiße Fläche, links eine Farbleiste nach Dringlichkeit, rechts eine
// Termin-Plakette, die man auch ohne Farbe lesen kann. "bald" ist hier
// Ampel-Grün statt Akzentfarbe - die ist im Dunkelmodus orange und wäre
// sonst kaum von "heute" (gelb) zu unterscheiden.

/** Kärtchen samt Farbleiste links. */
export const FAELLIGKEIT_KAERTCHEN: Record<Faelligkeit, string> = {
  ueberfaellig: "border-l-gefahr-voll",
  heute: "border-l-warnung-voll-rand",
  bald: "border-l-ok-voll",
  spaeter: "border-l-rand-ruhig",
  ohne: "border-l-rand-ruhig",
};
export const KAERTCHEN_BASIS =
  "rounded-lg border border-rand-ruhig border-l-[6px] bg-card shadow-sm";

/** Termin-Plakette rechts im Kärtchen. */
export const FAELLIGKEIT_PLAKETTE: Record<Faelligkeit, string> = {
  ueberfaellig: "border-gefahr-voll bg-gefahr-voll text-gefahr-voll-text",
  heute: "border-warnung-voll-rand bg-warnung-voll text-warnung-voll-text",
  bald: "border-ok-rand bg-ok-flaeche text-ok",
  spaeter: "border-rand-ruhig bg-background text-foreground",
  ohne: "border-rand-ruhig bg-background text-muted",
};

/** "Überfällig · 16.10.", "Heute", "Fr 23.10." - das Jahr nur, wenn es nicht das laufende ist. */
export function plakettenText(faelligkeit: Faelligkeit, faelligAm: Date | null, heute: Date): string {
  if (!faelligAm) return "ohne Termin";
  if (faelligkeit === "heute") return "Heute";
  // Termine sind Tage ohne Uhrzeit (UTC-Mitternacht) - darum in UTC formatieren.
  const tag = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    ...(faelligAm.getUTCFullYear() !== heute.getFullYear() ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(faelligAm);
  const mitPunkt = tag.endsWith(".") || tag.length > 6 ? tag : `${tag}.`;
  if (faelligkeit === "ueberfaellig") return `Überfällig · ${mitPunkt}`;
  const wochentag = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" })
    .format(faelligAm)
    .replace(".", "");
  return `${wochentag} ${mitPunkt}`;
}
