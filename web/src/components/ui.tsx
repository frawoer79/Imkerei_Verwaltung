import Link from "next/link";
import { ButtonHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AuswahlMitVorgabe } from "@/components/auswahl-mit-vorgabe";
import { UeberlangHinweis } from "@/components/ueberlang-hinweis";
import { feldGrenze, STANDARD_ZAHL_MAX } from "@/lib/eingabe-grenzen";

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /// Sprungziel, z.B. für "#eintrag-…" in der Adresse.
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-xl border border-border bg-card p-5 shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-muted">
      {children}
    </label>
  );
}

const feldKlassen =
  "w-full rounded-md border border-rand-bedienung bg-card px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-60 disabled:cursor-not-allowed";

// Höchstlänge und Zahlengrenze kommen aus lib/eingabe-grenzen.ts, wenn das
// Feld keine eigene angibt.
export function Input(props: React.ComponentProps<"input">) {
  const maxLength = props.maxLength ?? feldGrenze(props.name, props.type);
  const max = props.max ?? (props.type === "number" ? STANDARD_ZAHL_MAX : undefined);
  const feld = <input {...props} maxLength={maxLength} max={max} className={`${feldKlassen} ${props.className ?? ""}`} />;
  return mitUeberlangHinweis(feld, props.defaultValue ?? props.value, maxLength);
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const maxLength = props.maxLength ?? feldGrenze(props.name, "textarea");
  const feld = <textarea {...props} maxLength={maxLength} className={`${feldKlassen} ${props.className ?? ""}`} />;
  return mitUeberlangHinweis(feld, props.defaultValue ?? props.value, maxLength);
}

function mitUeberlangHinweis(feld: React.ReactElement, wert: unknown, grenze: number | undefined) {
  if (grenze === undefined || typeof wert !== "string" || wert.length <= grenze) return feld;
  return (
    <>
      {feld}
      <UeberlangHinweis laenge={wert.length} grenze={grenze} />
    </>
  );
}

// Mit defaultValue (ohne value) übernimmt AuswahlMitVorgabe, damit die
// Auswahl nach dem Speichern nicht auf die erste Option zurückspringt.
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const className = `${feldKlassen} ${props.className ?? ""}`;
  if (props.defaultValue !== undefined && props.value === undefined) {
    return <AuswahlMitVorgabe {...props} className={className} />;
  }
  return <select {...props} className={className} />;
}

// Schiebeschalter (Pille mit rundem Knopf) - z.B. für Hell-/Dunkelmodus oder
// zum Entsperren eines Formulars. Reiner Baustein ohne eigenen Zustand: der
// aufrufende Client-Code liefert `checked` und `onChange`.
export function Switch({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? "bg-accent" : "bg-rand-bedienung"} ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// Auswahl als Tipp-Chip (Radio-Knopf im Chip-Aussehen), z.B. Gebinde,
// Sorte oder Grund im Einlagern-Fenster. Alle Chips einer Reihe teilen
// sich denselben `gruppe`-Namen.
export function WahlChip({
  gruppe,
  aktiv,
  onWahl,
  children,
}: {
  gruppe: string;
  aktiv: boolean;
  onWahl: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={gruppe} checked={aktiv} onChange={onWahl} className="peer sr-only" />
      <span className="inline-flex min-h-10 items-center rounded-full border border-rand-bedienung bg-card px-3.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1">
        {children}
      </span>
    </label>
  );
}

// Chip mit × zum Entfernen, z.B. Sorten und Gebinde unter Einstellungen.
// Sieht aus wie ein WahlChip, damit eine Liste überall gleich wirkt.
export function EntfernChip({
  children,
  onEntfernen,
  beschriftung,
}: {
  children: React.ReactNode;
  onEntfernen: () => void;
  beschriftung: string;
}) {
  return (
    <span className="inline-flex min-h-10 items-center gap-1 rounded-full border border-rand-bedienung bg-card pl-3.5 pr-1 text-sm">
      {children}
      <button
        type="button"
        onClick={onEntfernen}
        aria-label={beschriftung}
        title={beschriftung}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-gefahr-flaeche hover:text-gefahr"
      >
        ✕
      </button>
    </span>
  );
}

// Gestrichelter Chip zum Hinzufügen ("+ Größe", "+ Sorte").
export function PlusChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center rounded-full border border-dashed border-rand-bedienung bg-card px-3.5 text-sm text-accent hover:border-accent"
    >
      {children}
    </button>
  );
}

// "Sortieren nach" mit einem WahlChip je Möglichkeit, z.B. Lagerliste nach
// Sorte oder Gebinde.
export function SortierWahl<W extends string>({
  gruppe,
  wert,
  optionen,
  onWahl,
}: {
  gruppe: string;
  wert: W;
  optionen: { wert: W; name: string }[];
  onWahl: (wert: W) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Sortieren nach" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Sortieren nach</span>
      {optionen.map((option) => (
        <WahlChip key={option.wert} gruppe={gruppe} aktiv={wert === option.wert} onWahl={() => onWahl(option.wert)}>
          {option.name}
        </WahlChip>
      ))}
    </div>
  );
}

// Zwischenüberschrift in einer umrandeten Liste (rounded-xl) mit Summe
// rechts, z.B. "Frühtracht · 66,5 kg" in der Lagerliste. `erste` rundet
// die oberen Ecken mit ab.
export function Zwischenkopf({
  titel,
  zusatz,
  erste = false,
}: {
  titel: React.ReactNode;
  zusatz?: React.ReactNode;
  erste?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-2 border-b border-border bg-background/70 px-3 py-1.5 ${erste ? "rounded-t-xl" : ""}`}>
      <h3 className="flex-1 text-sm font-semibold">{titel}</h3>
      {zusatz && <span className="shrink-0 text-xs text-muted tabular-nums">{zusatz}</span>}
    </div>
  );
}

type KnopfVariante = "primary" | "secondary" | "danger" | "leise" | "leiseGefahr";
type KnopfGroesse = "normal" | "mittel" | "klein" | "symbol";

// Klassen für Knöpfe - gemeinsam für <Button> und <LinkKnopf>, damit ein Link
// wie ein Knopf aussieht, ohne dass ein Knopf in einem Link steckt.
// Normal: 48 px hoch (Handschuhe, Sonne). "mittel": 44 px für Knöpfe in
// Zeilen neben Text. "klein": die alte, dichte Größe für
// Listen am PC. "symbol": quadratisch 44 px für einen Knopf nur mit Symbol
// (dann aria-label setzen), meist mit "leise"/"leiseGefahr" ohne Rahmen.
export function knopfKlassen(variant: KnopfVariante = "primary", groesse: KnopfGroesse = "normal") {
  const basis =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const groessen = {
    normal: "min-h-12 px-5 text-base",
    mittel: "min-h-11 px-3 text-sm",
    klein: "px-4 py-2 text-sm",
    symbol: "h-11 w-11 shrink-0",
  };
  const varianten = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "border border-rand-ruhig bg-card hover:bg-background",
    danger: "border border-gefahr text-gefahr hover:bg-gefahr-flaeche",
    leise: "text-muted hover:bg-background hover:text-foreground",
    leiseGefahr: "text-gefahr hover:bg-gefahr-flaeche",
  };
  return `${basis} ${groessen[groesse]} ${varianten[variant]}`;
}

export function Button({
  className = "",
  variant = "primary",
  groesse = "normal",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: KnopfVariante; groesse?: KnopfGroesse }) {
  return <button {...props} className={`${knopfKlassen(variant, groesse)} ${className}`} />;
}

// Link im Knopf-Aussehen (statt <Link><Button> ineinander zu stecken, was für
// Bildschirmleser ein Bedienelement im Bedienelement ist).
export function LinkKnopf({
  className = "",
  variant = "primary",
  groesse = "normal",
  href,
  children,
}: {
  className?: string;
  variant?: KnopfVariante;
  groesse?: KnopfGroesse;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${knopfKlassen(variant, groesse)} ${className}`}>
      {children}
    </Link>
  );
}
