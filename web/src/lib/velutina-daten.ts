// Gemeinsame Typen und Berechnungen zur Velutina-Warnung, ohne
// Datenbankzugriff - wird auf dem Server (Startseite, Mail) und im Browser
// (Karte) gleichermaßen benutzt.

export type VelutinaArt = "NEST" | "EINZELTIER";

export const VELUTINA_ART_LABEL: Record<VelutinaArt, string> = {
  NEST: "Nest",
  EINZELTIER: "Einzeltier",
};

export type Bereich = "akut" | "warnung";

export const AKUT_STANDARD_M = 2000;
export const WARN_STANDARD_M = 5000;
export const AKUT_MIN_M = 250;
export const AKUT_MAX_M = 5000;
export const WARN_MIN_M = 500;
export const WARN_MAX_M = 15000;

export const AKUT_FARBE = "#dc2626";
export const WARN_FARBE = "#f59e0b";

export type VelutinaPunkt = {
  id: string;
  art: VelutinaArt;
  datum: Date;
  meldungsNr: string | null;
  lat: number;
  lng: number;
  neu: boolean;
};

export type StandPunkt = { id: string; name: string; lat: number; lng: number; wanderstand?: boolean };

export type MeldungImBereich = VelutinaPunkt & {
  bereich: Bereich;
  // Nächstgelegener Stand und Abstand dorthin.
  standId: string;
  standName: string;
  abstandM: number;
};

// Abstand zweier Punkte auf der Erdkugel in Metern (Haversine-Formel) - auf
// wenige Kilometer genau genug, die Erde als Kugel gerechnet.
export function abstandMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Ordnet jede Meldung dem nächstgelegenen Stand zu und behält nur die, die
// im Akut- oder Warnbereich irgendeines Stands liegen. Sortiert: akut vor
// Warnung, darin nach Abstand.
export function meldungenImBereich<T extends VelutinaPunkt>(
  meldungen: T[],
  staende: StandPunkt[],
  akutRadiusM: number,
  warnRadiusM: number,
): (T & Omit<MeldungImBereich, keyof VelutinaPunkt>)[] {
  const ergebnis: (T & Omit<MeldungImBereich, keyof VelutinaPunkt>)[] = [];
  if (staende.length === 0) return ergebnis;

  for (const meldung of meldungen) {
    let naechster: StandPunkt | null = null;
    let kleinster = Infinity;
    for (const stand of staende) {
      const abstand = abstandMeter(meldung.lat, meldung.lng, stand.lat, stand.lng);
      if (abstand < kleinster) {
        kleinster = abstand;
        naechster = stand;
      }
    }
    if (!naechster || kleinster > warnRadiusM) continue;
    ergebnis.push({
      ...meldung,
      bereich: kleinster <= akutRadiusM ? "akut" : "warnung",
      standId: naechster.id,
      standName: naechster.name,
      abstandM: kleinster,
    });
  }

  return ergebnis.sort((a, b) =>
    a.bereich === b.bereich ? a.abstandM - b.abstandM : a.bereich === "akut" ? -1 : 1,
  );
}

export function abstandAnzeige(meter: number): string {
  if (meter < 1000) return `${Math.round(meter / 10) * 10} m`;
  return `${(meter / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
}

export function velutinaDatum(datum: Date): string {
  return datum.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

// Warnungen gelten für die laufende Saison: Meldungen mit Funddatum ab dem
// 1. Januar des aktuellen Jahres. Nester aus dem Vorjahr sind über Winter
// abgestorben, die Königinnen gründen im Frühjahr neu.
export function saisonBeginn(jetzt = new Date()): Date {
  return new Date(Date.UTC(jetzt.getFullYear(), 0, 1));
}
