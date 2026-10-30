import type { BeurteilungsEinstufung } from "@/components/stockkarten-eintrag-felder";

// Farbe nie allein: gelb = Dreieck mit "!", rot = Achteck mit "!". Grün
// bekommt kein Symbol - ruhige Werte sollen ruhig bleiben. Gezeichnet in
// currentColor; beim Achteck ist das "!" ausgespart (evenodd), damit es auf
// Karte, Kasten und gefüllter Plakette gleichermaßen funktioniert.
export function AmpelSymbol({
  einstufung,
  className = "h-[1.1em] w-[1.1em] shrink-0",
}: {
  einstufung: BeurteilungsEinstufung | null;
  className?: string;
}) {
  if (einstufung === "gelb") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
        <path d="M10 2.2 18.6 17.3H1.4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 7.6v4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="10" cy="14.7" r="1.25" fill="currentColor" />
      </svg>
    );
  }
  if (einstufung === "rot") {
    return (
      <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M6.6 1.8h6.8l4.8 4.8v6.8l-4.8 4.8H6.6l-4.8-4.8V6.6ZM8.9 5.4h2.2v6h-2.2ZM8.9 12.9h2.2v2.2h-2.2Z"
        />
      </svg>
    );
  }
  return null;
}
