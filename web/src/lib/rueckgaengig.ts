// Kleiner Speicher für die Rückgängig-Leiste (components/rueckgaengig-leiste.tsx).
// Er liegt außerhalb der Seiten, weil die abgehakte Maßnahme nach dem Speichern
// aus der Liste verschwindet und ihre Komponente mit ihr - die Leiste muss
// trotzdem stehen bleiben.

export type RueckgaengigAngebot = {
  /// Zählt hoch, damit ein neues Angebot den Ablauf der Leiste neu startet.
  nummer: number;
  /// z. B. "Erledigt: Varroa-Windel ziehen"
  text: string;
  aktion: () => Promise<unknown>;
};

let aktuell: RueckgaengigAngebot | null = null;
let zaehler = 0;
const hoerer = new Set<() => void>();

function melden() {
  hoerer.forEach((hoerer) => hoerer());
}

export function rueckgaengigAnbieten(text: string, aktion: () => Promise<unknown>) {
  zaehler += 1;
  aktuell = { nummer: zaehler, text, aktion };
  melden();
}

export function rueckgaengigSchliessen() {
  aktuell = null;
  melden();
}

export function rueckgaengigAbonnieren(hoerer_: () => void) {
  hoerer.add(hoerer_);
  return () => {
    hoerer.delete(hoerer_);
  };
}

export function rueckgaengigLesen() {
  return aktuell;
}

/// Abhaken einer Maßnahme melden: Die Leiste bietet für ein paar Sekunden an,
/// es wieder umzuschalten. `massnahme.erledigt` ist der Stand vor dem Tippen.
export function massnahmeAbgehakt(
  massnahme: { id: string; text: string; erledigt: boolean },
  umschalten: (massnahmeId: string) => Promise<unknown>
) {
  rueckgaengigAnbieten(
    `${massnahme.erledigt ? "Wieder offen" : "Erledigt"}: ${massnahme.text}`,
    () => umschalten(massnahme.id)
  );
}
