// Wählbare Gesamt-Designs (Entwürfe vom 20.10.2026, siehe
// entwuerfe/neue-designs/ im Projektordner). Jedes Konto, auch Tester, wählt
// pro Gerät. Die Farben je Design stehen in globals.css unter
// [data-design="..."].
export const DESIGNS = ["aktuell", "wabe", "klar"] as const;
export type Design = (typeof DESIGNS)[number];

// Angezeigte Namen nach Landschaften, die zu den Farben passen (seit
// 21.10.2026, vorher Klassisch, Honigwabe, Petrol). Die
// internen Schlüssel bleiben, damit die im Cookie gespeicherte Wahl gültig bleibt.
export const DESIGN_NAMEN: Record<Design, string> = {
  aktuell: "Wiese",
  wabe: "Wald",
  klar: "Bergsee",
};

export function istDesign(wert: unknown): wert is Design {
  return typeof wert === "string" && (DESIGNS as readonly string[]).includes(wert);
}
