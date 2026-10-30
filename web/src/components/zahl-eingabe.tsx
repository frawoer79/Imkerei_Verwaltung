import { Input } from "@/components/ui";

// Zahlenfeld fester Breite mit Einheit dahinter.
//
// Die Breite steht am Rahmen, nicht am Feld: die Input-Komponente bringt
// w-full mit, eine Breitenklasse direkt am Feld würde davon geschluckt.
// Weniger Innenabstand als sonst (px-2), damit neben den Spinner-Pfeilen
// genug Platz für die Zahl bleibt. w-20 reicht für drei Ziffern, w-24 für
// Werte mit Nachkommastelle wie "123,5".
export function ZahlEingabe({
  breite,
  einheit,
  ...felder
}: { breite: "w-20" | "w-24"; einheit: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <span className={breite}>
        <Input type="number" min="0" {...felder} className="px-2 py-1 text-sm tabular-nums" />
      </span>
      <span className="text-xs text-muted">{einheit}</span>
    </span>
  );
}
