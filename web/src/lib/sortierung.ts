// Natürliche Sortierung für Namen mit Zahlen: "Volk 2" kommt vor "Volk 10".
// Die Datenbank sortiert nur nach Text ("Volk 1, Volk 10, Volk 2"), deshalb
// wird nach dem Laden mit dem Collator nachsortiert.
const collator = new Intl.Collator("de", { numeric: true });

export const natuerlich = collator.compare;

/// Liste nach Namen natürlich sortiert (neue Liste, das Original bleibt).
export function nachNamen<T extends { name: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => collator.compare(a.name, b.name));
}
