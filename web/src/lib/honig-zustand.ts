// Ohne Datenbankzugriff, damit auch das Erfassungsformular (Client) es nutzen kann.

/// Optionaler Zustand bei Honig-Buchungen (gespeichert im Feld `zustand`).
export const HONIG_ZUSTAENDE = { UNBEARBEITET: "unbearbeitet", GERUEHRT: "gerührt" } as const;
export type HonigZustand = keyof typeof HONIG_ZUSTAENDE;

export function zustandText(zustand: string | null): string | null {
  return zustand && zustand in HONIG_ZUSTAENDE ? HONIG_ZUSTAENDE[zustand as HonigZustand] : null;
}

/// Sorte und Zustand zusammen, z.B. "Waldhonig, gerührt" - beides optional.
export function sorteMitZustand(sorteName: string | null, zustand: string | null): string | null {
  return [sorteName, zustandText(zustand)].filter(Boolean).join(", ") || null;
}
