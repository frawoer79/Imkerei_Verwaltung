"use client";

import { useEffect, useState } from "react";
import { DEMO_UPLOAD_MELDUNG } from "@/lib/demo-texte";

// Öffentliche Demo: Fotos und Dateien lassen sich nicht hochladen. Statt in
// jeder Auswahl eine eigene Sperre einzubauen, fängt das hier jeden Klick auf
// ein Dateifeld ab, auch die aus dem Code (input.click()), und zeigt kurz
// einen Hinweis. Der Server lehnt Uploads zusätzlich ab (lib/uploads.ts).
export function DemoUploadSperre() {
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    let zeitgeber: ReturnType<typeof setTimeout> | undefined;
    function abfangen(event: Event) {
      const ziel = event.target;
      if (ziel instanceof HTMLInputElement && ziel.type === "file") {
        event.preventDefault();
        event.stopPropagation();
        setSichtbar(true);
        clearTimeout(zeitgeber);
        zeitgeber = setTimeout(() => setSichtbar(false), 4000);
      }
    }
    function ablegenVerhindern(event: DragEvent) {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    }
    document.addEventListener("click", abfangen, true);
    document.addEventListener("drop", ablegenVerhindern, true);
    return () => {
      document.removeEventListener("click", abfangen, true);
      document.removeEventListener("drop", ablegenVerhindern, true);
      clearTimeout(zeitgeber);
    };
  }, []);

  if (!sichtbar) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-lg border border-warnung-rand bg-warnung-flaeche px-4 py-3 text-center text-sm text-warnung shadow-lg"
    >
      {DEMO_UPLOAD_MELDUNG}
    </div>
  );
}
