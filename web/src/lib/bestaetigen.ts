// Ersatz für window.confirm(): Die Rückfrage des Browsers erscheint je nach
// Browser oben am Fensterrand statt in der Mitte und passt nicht zum Hell-/
// Dunkelmodus der App. Diese Funktion zeigt stattdessen ein eigenes Popup
// (natives <dialog> wie die anderen Popups, also mittig, mit Fokusfalle und
// Escape) und liefert true, wenn der Ja-Knopf gedrückt wurde.
//
// Das Popup wird direkt im DOM erzeugt und danach wieder entfernt, damit die
// Aufrufer keinen eigenen Zustand dafür brauchen.

const KNOPF_BASIS =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer";
const KNOPF_ABBRECHEN = "border border-border bg-card hover:bg-background";
const KNOPF_JA = "bg-accent text-accent-foreground hover:opacity-90";
const KNOPF_JA_GEFAHR =
  "border border-gefahr text-gefahr hover:bg-gefahr-flaeche";

export function bestaetigen(
  frage: string,
  {
    ja = "Ja",
    nein = "Abbrechen",
    gefahr = false,
  }: { ja?: string; nein?: string; gefahr?: boolean } = {},
): Promise<boolean> {
  return new Promise((aufloesen) => {
    const dialog = document.createElement("dialog");
    dialog.className =
      "w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50";

    const inhalt = document.createElement("div");
    inhalt.className = "flex flex-col gap-4 p-5";

    const text = document.createElement("p");
    text.className = "whitespace-pre-line";
    text.textContent = frage;

    const knoepfe = document.createElement("div");
    knoepfe.className = "flex justify-end gap-2";

    const abbrechen = document.createElement("button");
    abbrechen.type = "button";
    abbrechen.className = `${KNOPF_BASIS} ${KNOPF_ABBRECHEN}`;
    abbrechen.textContent = nein;

    const bestaetigt = document.createElement("button");
    bestaetigt.type = "button";
    bestaetigt.className = `${KNOPF_BASIS} ${gefahr ? KNOPF_JA_GEFAHR : KNOPF_JA}`;
    bestaetigt.textContent = ja;

    knoepfe.append(abbrechen, bestaetigt);
    inhalt.append(text, knoepfe);
    dialog.append(inhalt);

    let ergebnis = false;
    abbrechen.addEventListener("click", () => dialog.close());
    bestaetigt.addEventListener("click", () => {
      ergebnis = true;
      dialog.close();
    });
    // Tippen neben das Popup = Abbrechen.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      aufloesen(ergebnis);
    });

    document.body.append(dialog);
    dialog.showModal();
    abbrechen.focus();
  });
}
