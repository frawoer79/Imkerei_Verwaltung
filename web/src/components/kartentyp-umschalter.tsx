"use client";

import type { Kartentyp } from "@/lib/kartenebenen";

const OPTIONEN: { typ: Kartentyp; label: string }[] = [
  { typ: "karte", label: "Karte" },
  { typ: "satellit", label: "Satellit" },
  { typ: "hybrid", label: "Hybrid" },
];

export function KartentypUmschalter({
  kartentyp,
  onChange,
}: {
  kartentyp: Kartentyp;
  onChange: (typ: Kartentyp) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {OPTIONEN.map(({ typ, label }, index) => (
        <button
          key={typ}
          type="button"
          onClick={() => onChange(typ)}
          className={`px-3 py-1.5 text-xs font-medium ${index > 0 ? "border-l border-border" : ""} ${
            kartentyp === typ ? "bg-accent text-accent-foreground" : "bg-card hover:bg-background"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
