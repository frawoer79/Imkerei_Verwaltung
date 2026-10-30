import type { Standtyp } from "@/generated/prisma/enums";

export const STANDTYP_BEZEICHNUNG: Record<Standtyp, string> = {
  FEST: "Fester Stand",
  WANDER: "Wanderstand",
};

// Kleines Kennzeichen, ob ein Stand fest (mit Überwinterung) oder nur ein
// Wanderstand ist. `aufFoto` für den dunklen Kopfbereich der Stand-Seite.
export function StandtypBadge({ standtyp, aufFoto = false }: { standtyp: Standtyp; aufFoto?: boolean }) {
  const farbe = aufFoto
    ? standtyp === "WANDER"
      ? "bg-amber-400/90 text-amber-950"
      : "bg-white/20 text-white"
    : standtyp === "WANDER"
      ? "bg-warnung-flaeche text-warnung"
      : "bg-background text-muted";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${farbe}`}>
      {STANDTYP_BEZEICHNUNG[standtyp]}
    </span>
  );
}

// Auswahl im Formular "Bienenstand anlegen/bearbeiten".
export function StandtypAuswahl({ standardwert = "FEST" }: { standardwert?: Standtyp }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-muted">Art des Stands</legend>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="standtyp" value="FEST" defaultChecked={standardwert === "FEST"} className="mt-1" />
        <span>
          Fester Stand <span className="text-muted">(dort wird auch überwintert)</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="standtyp" value="WANDER" defaultChecked={standardwert === "WANDER"} className="mt-1" />
        <span>
          Wanderstand <span className="text-muted">(Völker stehen nur vorübergehend dort, z.B. für eine Tracht oder als Ableger)</span>
        </span>
      </label>
    </fieldset>
  );
}
