// Verkäufe: gemeinsame Regeln für Lager-Seite, Verkaufsliste und Aktionen.
// Erzeugnisse gelten als verkauft, wenn ein Abgang den Grund "Verkauf" trägt
// (auch frei getippt wie "Verkauf an Familie Maier"). Völker, Ableger und
// Königinnen stehen in der Tabelle Verkauf.
import { postenWert, type PreisQuelle } from "@/lib/warenwert";

export const VERKAUF_ARTEN = ["VOLK", "ABLEGER", "KOENIGIN", "SONSTIGES"] as const;
export type VerkaufArt = (typeof VERKAUF_ARTEN)[number];

export const VERKAUF_ART_NAME: Record<VerkaufArt, string> = {
  VOLK: "Volk",
  ABLEGER: "Ableger",
  KOENIGIN: "Königin",
  SONSTIGES: "Sonstiges",
};

export function istVerkaufGrund(grund: string | null | undefined): boolean {
  return Boolean(grund && /^verkauf/i.test(grund.trim()));
}

// Ist diese Lagerbuchung ein Verkauf? Nur Abgänge, "Zurück vom Verkauf" ist
// ein Zugang und zählt nicht.
export function istVerkaufBuchung(buchung: { menge: number; grund: string | null }): boolean {
  return buchung.menge < 0 && istVerkaufGrund(buchung.grund);
}

export type VerkaufErloes = { wert: number | null; geschaetzt: boolean };

// Erlös einer Verkaufsbuchung: der erfasste Betrag, sonst geschätzt nach der
// aktuellen Preisliste (nur wenn es dort einen Preis gibt).
export function buchungErloes(
  buchung: { erloes: number | null; sorteId: string | null; gebindeId: string | null; anzahl: number | null; menge: number },
  typ: PreisQuelle,
): VerkaufErloes {
  if (buchung.erloes !== null) return { wert: buchung.erloes, geschaetzt: false };
  const wert = postenWert(
    {
      sorteId: buchung.sorteId,
      gebindeId: buchung.gebindeId,
      anzahl: buchung.anzahl === null ? null : Math.abs(buchung.anzahl),
      menge: Math.abs(buchung.menge),
    },
    typ,
  );
  return wert ? { wert: wert.wert, geschaetzt: true } : { wert: null, geschaetzt: false };
}

// Betrag aus einem Eingabefeld: "12,50" -> 12.5, leer -> null.
export function betragAusText(text: string | null | undefined): number | null {
  if (!text) return null;
  const sauber = text.replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (sauber === "") return null;
  const zahl = Number(sauber);
  return Number.isFinite(zahl) && zahl >= 0 ? Math.round(zahl * 100) / 100 : null;
}
